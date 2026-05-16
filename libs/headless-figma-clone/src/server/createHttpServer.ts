import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { FileEnvelope } from '../model/types.js';
import type { HeadlessFigmaRuntimeConfig } from '../config/types.js';
import type { DocumentEngine } from '../engine/DocumentEngine.js';
import { designCompiler } from '../render/DesignCompiler.js';
import { buildImageDataUrlByHash } from '../render/imageDataUrls.js';
import type { Logger } from '../util/logger.js';
import { createHeadlessMcpServer } from '../mcp/registerTools.js';
import { ExportError } from '../import/exportHandler.js';

type SessionEntry = {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createHeadlessMcpServer>;
};

const DEFAULT_JSON_BODY_LIMIT = 200 * 1024 * 1024;

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

function httpRequestBaseUrl(req: IncomingMessage, fallbackHost: string, fallbackPort: number): string {
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  if (req.headers.host) {
    return `${proto}://${req.headers.host}`;
  }
  return `${proto}://${fallbackHost}:${String(fallbackPort)}`;
}

function debugPreviewShell(innerHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>headless-figma-clone preview</title></head><body style="margin:24px;font-family:ui-sans-serif,system-ui,sans-serif">${innerHtml}</body></html>`;
}

export async function createHttpServer(params: {
  config: HeadlessFigmaRuntimeConfig;
  engine: DocumentEngine;
  logger: Logger;
}): Promise<{ server: Server; port: number; close: () => Promise<void> }> {
  const { config, engine, logger } = params;
  const transports: Record<string, SessionEntry> = {};

  const debugPreviewStore = { html: debugPreviewShell('No active file loaded.') };

  const refreshDebugPreview = (env: FileEnvelope): void => {
    const currentPageId = engine.getCurrentPageId();
    const page = currentPageId
      ? env.document.children.find((c) => c.type === 'PAGE' && c.id === currentPageId)
      : env.document.children[0];
    if (!page || page.children.length === 0) {
      debugPreviewStore.html = debugPreviewShell('Active file has no frames yet.');
      return;
    }
    try {
      const compiled = designCompiler.compileFirstPage({
        envelope: env,
        pageId: page.id,
        options: {
          viewportPaddingPx: 16,
          includeCss: true,
          inlineCss: true,
          imageDataUrlByHash: (() => {
            const fp = engine.getActiveFilePath();
            return fp ? buildImageDataUrlByHash(env, fp) : {};
          })(),
        },
      });
      debugPreviewStore.html = compiled.html;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      debugPreviewStore.html = debugPreviewShell(`<pre>${escapeHtml(msg)}</pre>`);
    }
  };

  if (config.allowDebug) {
    engine.attachDebugPreviewListener(refreshDebugPreview);
    const cur = engine.getActiveFile();
    if (cur) refreshDebugPreview(cur);
  }

  const httpServer = createServer(async (req, res) => {
    try {
      const url = req.url?.split('?')[0] ?? '';

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
          exportEndpoint: '/export/hfc',
        });
        return;
      }

      if (req.method === 'POST' && url === '/export/hfc') {
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
        const reqBody = body as { hfcFileName?: string; snapshot?: unknown };
        try {
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
        sendJson(res, 200, {
          workspaceDir: resolve(config.workspaceDir),
          files: rows.map((f) => ({
            filePath: f.filePath,
            fileKey: f.fileKey,
            fileName: f.fileName,
            active: f.filePath === activePath,
            setActiveUrl: `${base}/files/active?path=${encodeURIComponent(f.filePath)}`,
          })),
        });
        return;
      }

      if (req.method === 'GET' && url === '/files/active') {
        const raw = req.url ?? '';
        const qIdx = raw.indexOf('?');
        const qs = qIdx >= 0 ? raw.slice(qIdx + 1) : '';
        const pathParam = new URLSearchParams(qs).get('path');
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
        const f = engine.getActiveFile();
        sendJson(res, 200, {
          ok: true,
          fileKey: f?.fileKey,
          filePath: engine.getActiveFilePath(),
          fileName: f?.fileName,
        });
        return;
      }

      if (req.method === 'POST' && url === '/debug/load-file') {
        if (!config.allowDebug) {
          sendError(res, 404, 'NOT_FOUND', 'Debug routes disabled');
          return;
        }
        const body = (await readJsonBody(req)) as { path?: string };
        if (!body?.path || typeof body.path !== 'string') {
          sendError(res, 400, 'BAD_REQUEST', 'Missing path');
          return;
        }
        await engine.loadFromDisk({ absolutePath: body.path });
        const f = engine.getActiveFile();
        sendJson(res, 200, {
          fileKey: f?.fileKey,
          filePath: engine.getActiveFilePath(),
        });
        return;
      }

      if (req.method === 'GET' && url === '/debug/preview') {
        if (!config.allowDebug) {
          sendError(res, 404, 'NOT_FOUND', 'Debug routes disabled');
          return;
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(debugPreviewStore.html);
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
    if (config.allowDebug) {
      engine.attachDebugPreviewListener(null);
    }
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
