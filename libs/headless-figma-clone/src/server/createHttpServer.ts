import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { setFontsDir } from '../fonts/localFontRegistry.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { FileEnvelope } from '../model/types.js';
import type { HeadlessFigmaRuntimeConfig } from '../config/types.js';
import type { DocumentEngine } from '../engine/DocumentEngine.js';
import { designCompiler } from '../render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../render/imageDataUrls.js';
import type { Logger } from '../util/logger.js';
import { createHeadlessMcpServer } from '../mcp/registerTools.js';
import { ExportError, handleImportHfc, handleImportHfcFromSession } from '../import/exportHandler.js';
import { collectPagesIndex } from '../mcp/metadata.js';
import { renderFilesBrowserHtml } from './ui/filesBrowser.js';
import { previewEmptyShell, wrapPreviewWithToolbar, type PreviewShellParams } from './ui/previewShell.js';

type SessionEntry = {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createHeadlessMcpServer>;
};

const DEFAULT_JSON_BODY_LIMIT = 200 * 1024 * 1024;

const PREVIEW_REDIRECT_RE = /^\/preview(\?.*)?$/;

/** Figma plugin UI iframes use a `null` origin; browsers only allow `Access-Control-Allow-Origin: *`. */
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
  'Access-Control-Max-Age': '86400',
};

function applyCors(res: ServerResponse): void {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
}

function readJsonBody(req: IncomingMessage, maxBytes = DEFAULT_JSON_BODY_LIMIT): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (c) => {
      const buf = c as Buffer;
      total += buf.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) resolve(undefined);
        else resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(data);
}

function sendError(
  res: ServerResponse,
  status: number,
  code: string,
  message: string,
  details?: unknown
): void {
  sendJson(res, status, { error: { code, message, details } });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Rejects paths that escape `root` via symlinks or `..` segments after resolve. */
function isResolvedPathInsideWorkspace(root: string, candidateAbsolute: string): boolean {
  const rootR = resolve(root);
  const candR = resolve(candidateAbsolute);
  const rel = relative(rootR, candR);
  return rel !== '' && !rel.startsWith('..');
}

function isPathInsideRoot(root: string, candidateAbsolute: string): boolean {
  const rootR = resolve(root);
  const candR = resolve(candidateAbsolute);
  const rel = relative(rootR, candR);
  return rel === '' || (!rel.startsWith('..') && !resolve(rel).startsWith('..'));
}

const FONT_MIME: Record<string, string> = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.json': 'application/json',
};

function httpRequestBaseUrl(req: IncomingMessage, fallbackHost: string, fallbackPort: number): string {
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  if (req.headers.host) {
    return `${proto}://${req.headers.host}`;
  }
  return `${proto}://${fallbackHost}:${String(fallbackPort)}`;
}

function isAllowedPreviewRedirect(redirect: string): boolean {
  return PREVIEW_REDIRECT_RE.test(redirect);
}

function resolvePreviewPageId(
  env: FileEnvelope,
  engine: DocumentEngine,
  requestedPageId: string | null
): string | null {
  const pages = collectPagesIndex(env.document);
  if (pages.length === 0) return null;
  if (requestedPageId && pages.some((p) => p.id === requestedPageId)) {
    return requestedPageId;
  }
  const current = engine.getCurrentPageId();
  if (current && pages.some((p) => p.id === current)) return current;
  return pages[0]!.id;
}

/** When `HFC_PREVIEW_ON_LOAD` is `0` / `false`, skip compiling preview at HTTP startup (saves memory). */
function isPreviewOnLoadEnabled(): boolean {
  const raw = process.env.HFC_PREVIEW_ON_LOAD?.trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'no';
}

function shellParams(env: FileEnvelope, pageId: string | null): PreviewShellParams {
  return {
    fileName: env.fileName,
    pages: collectPagesIndex(env.document),
    currentPageId: pageId,
  };
}

export async function createHttpServer(params: {
  config: HeadlessFigmaRuntimeConfig;
  engine: DocumentEngine;
  logger: Logger;
}): Promise<{ server: Server; port: number; close: () => Promise<void> }> {
  const { config, engine, logger } = params;
  setFontsDir(config.fontsDir);
  const transports: Record<string, SessionEntry> = {};

  const previewFontBaseUrl = (req?: IncomingMessage): string => {
    const base = req
      ? httpRequestBaseUrl(req, config.httpHost, config.httpPort)
      : `http://${config.httpHost}:${String(config.httpPort)}`;
    return `${base}/fonts/inter/`;
  };

  const previewStore = {
    html: previewEmptyShell('<p>No active file loaded.</p>', {
      fileName: '—',
      pages: [],
      currentPageId: null,
    }),
    pageId: null as string | null,
  };

  const compilePreviewHtml = (env: FileEnvelope, pageId: string | null, req?: IncomingMessage): string => {
    const resolvedPageId = resolvePreviewPageId(env, engine, pageId);
    const shell = shellParams(env, resolvedPageId);
    if (!resolvedPageId) {
      return previewEmptyShell('<p>Active file has no pages.</p>', shell);
    }
    const page = env.document.children.find((c) => c.type === 'PAGE' && c.id === resolvedPageId);
    if (!page || page.children.length === 0) {
      return previewEmptyShell('<p>Active file has no frames yet.</p>', shell);
    }
    try {
      const compiled = designCompiler.compileFirstPage({
        envelope: env,
        pageId: page.id,
        options: {
          viewportPaddingPx: 16,
          includeCss: true,
          inlineCss: true,
          fontBaseUrl: previewFontBaseUrl(req),
          imageDataUrlByHash: (() => {
            const fp = engine.getActiveFilePath();
            return fp ? buildImageDataUrlForSubtree(env, fp, page.id) : {};
          })(),
        },
      });
      return wrapPreviewWithToolbar(compiled.html, shell);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return previewEmptyShell(`<pre>${escapeHtml(msg)}</pre>`, shell);
    }
  };

  const refreshPreview = (env: FileEnvelope): void => {
    const resolvedPageId = resolvePreviewPageId(env, engine, previewStore.pageId);
    previewStore.pageId = resolvedPageId;
    if (!isPreviewOnLoadEnabled()) return;
    previewStore.html = compilePreviewHtml(env, resolvedPageId);
  };

  engine.attachPreviewListener(refreshPreview);
  const cur = engine.getActiveFile();
  if (cur && isPreviewOnLoadEnabled()) refreshPreview(cur);

  const httpServer = createServer(async (req, res) => {
    try {
      applyCors(res);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url?.split('?')[0] ?? '';

      if (req.method === 'GET' && url.startsWith('/fonts/')) {
        const rel = decodeURIComponent(url.slice('/fonts/'.length));
        if (!rel || rel.includes('..')) {
          sendError(res, 400, 'BAD_REQUEST', 'Invalid font path');
          return;
        }
        const fontsRoot = resolve(config.fontsDir);
        const abs = resolve(join(fontsRoot, rel));
        if (!isPathInsideRoot(fontsRoot, abs)) {
          sendError(res, 403, 'FORBIDDEN', 'Font path outside fonts directory');
          return;
        }
        if (!existsSync(abs)) {
          sendError(res, 404, 'NOT_FOUND', 'Font file not found');
          return;
        }
        const buf = readFileSync(abs);
        const ext = extname(abs).toLowerCase();
        res.writeHead(200, {
          'content-type': FONT_MIME[ext] ?? 'application/octet-stream',
          'content-length': String(buf.length),
          'cache-control': 'public, max-age=86400',
        });
        res.end(buf);
        return;
      }

      if (req.method === 'GET' && url.startsWith('/assets/')) {
        const id = decodeURIComponent(url.slice('/assets/'.length).split('/')[0] ?? '');
        if (!/^[a-f0-9]{64}$/.test(id)) {
          sendError(res, 400, 'BAD_REQUEST', 'Invalid asset id');
          return;
        }
        const file = engine.getActiveFile();
        const fp = engine.getActiveFilePath();
        const rec = file?.assets?.byId[id];
        if (!rec || !fp) {
          sendError(res, 404, 'NOT_FOUND', 'Unknown asset');
          return;
        }
        const abs = join(dirname(fp), rec.relativePath);
        if (!existsSync(abs)) {
          sendError(res, 404, 'NOT_FOUND', 'Asset file missing on disk');
          return;
        }
        const buf = readFileSync(abs);
        res.writeHead(200, {
          'content-type': rec.mimeType,
          'content-length': String(buf.length),
        });
        res.end(buf);
        return;
      }

      if (req.method === 'GET' && url === '/health') {
        sendJson(res, 200, {
          status: 'ok',
          version: config.version,
          importEndpoint: '/import/hfc',
          importFromSessionEndpoint: '/import/hfc-from-session',
          exportEndpoint: '/export/hfc',
          previewEndpoint: '/preview',
        });
        return;
      }

      if (req.method === 'POST' && url === '/import/hfc-from-session') {
        let body: unknown;
        try {
          body = await readJsonBody(req);
        } catch (e) {
          if (e instanceof Error && e.message === 'PAYLOAD_TOO_LARGE') {
            sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds size limit');
            return;
          }
          throw e;
        }
        try {
          const result = handleImportHfcFromSession(
            body as import('../import/exportHandler.js').ImportHfcFromSessionBody
          );
          sendJson(res, 200, result);
        } catch (e) {
          if (e instanceof ExportError) {
            const status = e.code === 'BAD_REQUEST' ? 400 : 422;
            sendError(res, status, e.code, e.message);
            return;
          }
          throw e;
        }
        return;
      }

      const importOrExportMatch =
        req.method === 'POST' &&
        (url === '/import/hfc' || url.startsWith('/export/hfc'));
      if (importOrExportMatch) {
        let body: unknown;
        try {
          body = await readJsonBody(req);
        } catch (e) {
          if (e instanceof Error && e.message === 'PAYLOAD_TOO_LARGE') {
            sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds size limit');
            return;
          }
          throw e;
        }
        const reqBody = body as {
          hfcFileName?: string;
          snapshot?: unknown;
          assetFiles?: import('../import/exportHandler.js').ExportHfcAssetFile[];
        };
        const save =
          url === '/export/hfc' &&
          new URL(req.url ?? '', 'http://localhost').searchParams.get('save') === 'true';
        try {
          if (url === '/import/hfc' || !save) {
            const result = handleImportHfc({
              hfcFileName: reqBody.hfcFileName ?? '',
              snapshot: reqBody.snapshot,
              assetFiles: reqBody.assetFiles,
            });
            sendJson(res, 200, result);
            return;
          }
          const result = await engine.exportFromFigmaSnapshot(
            { hfcFileName: reqBody.hfcFileName ?? '', snapshot: reqBody.snapshot },
            config.workspaceDir
          );
          sendJson(res, 200, result);
        } catch (e) {
          if (e instanceof ExportError) {
            const status = e.code === 'BAD_REQUEST' ? 400 : 422;
            sendError(res, status, e.code, e.message);
            return;
          }
          throw e;
        }
        return;
      }

      if (req.method === 'GET' && url === '/files') {
        const addr = httpServer.address();
        const listenPort =
          typeof addr === 'object' && addr && 'port' in addr ? addr.port : config.httpPort;
        const base = httpRequestBaseUrl(req, config.httpHost, listenPort);
        const rows = await engine.listHfcFilesInWorkspace(config.workspaceDir);
        const activePath = engine.getActiveFilePath();
        const html = renderFilesBrowserHtml({
          workspaceDir: resolve(config.workspaceDir),
          files: rows.map((f) => ({
            filePath: f.filePath,
            fileKey: f.fileKey,
            fileName: f.fileName,
            active: f.filePath === activePath,
            viewUrl: `${base}/files/active?path=${encodeURIComponent(f.filePath)}&redirect=${encodeURIComponent('/preview')}`,
          })),
        });
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (req.method === 'GET' && url === '/files/active') {
        const raw = req.url ?? '';
        const qIdx = raw.indexOf('?');
        const qs = qIdx >= 0 ? raw.slice(qIdx + 1) : '';
        const params = new URLSearchParams(qs);
        const pathParam = params.get('path');
        const redirectParam = params.get('redirect');
        if (!pathParam) {
          sendError(res, 400, 'BAD_REQUEST', 'Missing path query parameter');
          return;
        }
        let decoded: string;
        try {
          decoded = decodeURIComponent(pathParam);
        } catch {
          sendError(res, 400, 'BAD_REQUEST', 'Invalid path encoding');
          return;
        }
        const absoluteTarget = resolve(decoded);
        if (!isResolvedPathInsideWorkspace(config.workspaceDir, absoluteTarget)) {
          sendError(res, 403, 'FORBIDDEN', 'Path must be under the configured workspace directory');
          return;
        }
        if (!absoluteTarget.endsWith('.hfc.json')) {
          sendError(res, 400, 'BAD_REQUEST', 'Path must be a .hfc.json file');
          return;
        }
        await engine.loadFromDisk({ absolutePath: absoluteTarget });
        if (redirectParam) {
          if (!isAllowedPreviewRedirect(redirectParam)) {
            sendError(res, 400, 'BAD_REQUEST', 'Invalid redirect target');
            return;
          }
          res.writeHead(302, { Location: redirectParam });
          res.end();
          return;
        }
        const f = engine.getActiveFile();
        sendJson(res, 200, {
          ok: true,
          fileKey: f?.fileKey,
          filePath: engine.getActiveFilePath(),
          fileName: f?.fileName,
        });
        return;
      }

      if (req.method === 'GET' && url === '/preview') {
        const env = engine.getActiveFile();
        if (!env) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
          res.end(previewStore.html);
          return;
        }
        const raw = req.url ?? '';
        const qIdx = raw.indexOf('?');
        const qs = qIdx >= 0 ? raw.slice(qIdx + 1) : '';
        const pageIdParam = new URLSearchParams(qs).get('pageId');
        const resolvedPageId = resolvePreviewPageId(env, engine, pageIdParam);
        if (resolvedPageId) {
          engine.setCurrentPageId(resolvedPageId);
        }
        previewStore.pageId = resolvedPageId;
        previewStore.html = compilePreviewHtml(env, resolvedPageId, req);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(previewStore.html);
        return;
      }

      if (url === '/mcp') {
        if (req.method === 'POST') {
          const parsedBody = await readJsonBody(req);
          const sessionHeader = req.headers['mcp-session-id'];
          const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;

          const isInit = Array.isArray(parsedBody)
            ? parsedBody.some((m) => isInitializeRequest(m))
            : isInitializeRequest(parsedBody);

          if (sessionId && transports[sessionId]) {
            await transports[sessionId].transport.handleRequest(req, res, parsedBody);
            return;
          }

          if (!sessionId && isInit) {
            const mcpServer = createHeadlessMcpServer({
              engine,
              screenshotTimeoutMs: config.screenshotTimeoutMs,
              screenshotDefaultBackground: config.screenshotDefaultBackground,
              screenshotDefaultDeviceScaleFactor: config.screenshotDefaultDeviceScaleFactor,
            });
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              enableJsonResponse: true,
              onsessioninitialized: (sid) => {
                transports[sid] = { transport, server: mcpServer };
              },
            });
            transport.onclose = () => {
              const sid = transport.sessionId;
              if (sid && transports[sid]) {
                delete transports[sid];
              }
            };
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res, parsedBody);
            return;
          }

          sendJson(res, 400, {
            jsonrpc: '2.0',
            error: { code: -32_000, message: 'Bad Request: No valid session' },
            id: null,
          });
          return;
        }
        if (req.method === 'GET') {
          res.writeHead(405, { Allow: 'POST' });
          res.end('Method Not Allowed');
          return;
        }
      }

      sendError(res, 404, 'NOT_FOUND', 'Not found');
    } catch (e) {
      logger.error('http_handler_error', { err: String(e) });
      if (!res.headersSent) {
        sendError(res, 500, 'INTERNAL', e instanceof Error ? e.message : 'Error');
      }
    }
  });

  const close = async (): Promise<void> => {
    engine.attachPreviewListener(null);
    for (const sid of Object.keys(transports)) {
      const entry = transports[sid];
      if (entry) {
        try {
          await entry.transport.close();
        } catch {
          /* ignore */
        }
        try {
          await entry.server.close();
        } catch {
          /* ignore */
        }
      }
      delete transports[sid];
    }
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  };

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(config.httpPort, config.httpHost, () => resolve());
    httpServer.on('error', reject);
  });

  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr && 'port' in addr ? addr.port : config.httpPort;

  return { server: httpServer, port, close };
}
