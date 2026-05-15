import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { LocalFigmaMcpConfig } from '../config.js';
import type { PluginBridge } from '../bridge/PluginBridge.js';
import type { ScreenshotAssetStore } from '../bridge/ScreenshotAssetStore.js';
import { createLocalFigmaMcpServer } from '../mcp/registerTools.js';
import { attachPluginWebSocket } from './attachWebSocket.js';

type SessionEntry = {
  transport: StreamableHTTPServerTransport;
  server: ReturnType<typeof createLocalFigmaMcpServer>;
};

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
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
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export async function createHttpServer(params: {
  config: LocalFigmaMcpConfig;
  bridge: PluginBridge;
  screenshotStore: ScreenshotAssetStore;
}): Promise<{ server: Server; port: number; close: () => Promise<void> }> {
  const { config, bridge, screenshotStore } = params;
  const transports: Record<string, SessionEntry> = {};
  let listenPort = config.httpPort;

  const getBaseUrl = (): string => `http://${config.httpHost}:${listenPort}`;

  const httpServer = createServer(async (req, res) => {
    try {
      const url = req.url?.split('?')[0] ?? '';

      if (req.method === 'GET' && url.startsWith('/assets/')) {
        const token = decodeURIComponent(url.slice('/assets/'.length).split('/')[0] ?? '');
        const asset = screenshotStore.get(token);
        if (!asset) {
          sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Screenshot expired or unknown' } });
          return;
        }
        res.writeHead(200, {
          'content-type': asset.mimeType,
          'content-length': String(asset.bytes.length),
          'cache-control': 'no-store',
        });
        res.end(asset.bytes);
        return;
      }

      if (req.method === 'GET' && url === '/health') {
        const session = bridge.getSession();
        sendJson(res, 200, {
          status: 'ok',
          version: config.version,
          pluginConnected: bridge.connected,
          fileKey: session?.fileKey ?? null,
          fileName: session?.fileName ?? null,
        });
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
            const mcpServer = createLocalFigmaMcpServer({
              bridge,
              screenshotStore,
              getBaseUrl,
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
              if (sid && transports[sid]) delete transports[sid];
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

      sendJson(res, 404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
    } catch (e) {
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: { code: 'INTERNAL', message: e instanceof Error ? e.message : 'Error' },
        });
      }
    }
  });

  attachPluginWebSocket(httpServer, '/plugin', bridge);

  const close = async (): Promise<void> => {
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
  listenPort = typeof addr === 'object' && addr && 'port' in addr ? addr.port : config.httpPort;

  return { server: httpServer, port: listenPort, close };
}
