import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { CHECK_CATALOG } from './check-catalog.js';
import type { TaskBuilderConfig } from './config.js';
import { ExportStreamSessionStore } from './export-stream-session.js';
import { EXPORT_STREAM_PART_MAX_BYTES } from './stream-protocol.js';
import { TasksStore } from './tasks-store.js';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const BODY_LIMIT = 200 * 1024 * 1024;

function applyCors(res: ServerResponse): void {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

function readTextBody(req: IncomingMessage, maxBytes: number): Promise<string> {
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
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (c) => {
      const buf = c as Buffer;
      total += buf.length;
      if (total > BODY_LIMIT) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  applyCors(res);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: { message } });
}

function taskIdFromUrl(url: string): string | null {
  const m = url.match(/^\/tasks\/([^/?]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

function exportIdFromStreamUrl(url: string): string | null {
  const m = url.match(/^\/export\/stream\/([^/]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

export function createTaskBuilderServer(config: TaskBuilderConfig, store: TasksStore) {
  const streamStore = new ExportStreamSessionStore(config);

  const server = createServer(async (req, res) => {
    applyCors(res);
    const url = (req.url ?? '/').split('?')[0]!;

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.method === 'GET' && url === '/health') {
        sendJson(res, 200, {
          status: 'ok',
          tasksDir: config.tasksDir,
          harborTasksDir: config.harborTasksDir,
          hfcUrl: config.hfcUrl,
        });
        return;
      }

      if (req.method === 'GET' && url === '/check-catalog') {
        sendJson(res, 200, CHECK_CATALOG);
        return;
      }

      if (req.method === 'GET' && url === '/tasks') {
        sendJson(res, 200, { tasks: store.listTasks() });
        return;
      }

      if (req.method === 'POST' && url === '/tasks') {
        const body = (await readJsonBody(req)) as { name?: string; copyFrom?: string };
        if (!body?.name?.trim()) {
          sendError(res, 400, 'name is required');
          return;
        }
        const state = store.createTask(body.name.trim(), body.copyFrom?.trim());
        sendJson(res, 201, { task: state });
        return;
      }

      if (req.method === 'POST' && url === '/export') {
        const body = (await readJsonBody(req)) as { hfcFileName?: string; snapshot?: unknown };
        if (!body?.hfcFileName || body.snapshot === undefined) {
          sendError(res, 400, 'hfcFileName and snapshot required');
          return;
        }
        const result = await store.standaloneExport(body.hfcFileName, body.snapshot);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'POST' && url === '/export/stream/session') {
        const session = streamStore.createSession();
        sendJson(res, 201, session);
        return;
      }

      const streamExportId = exportIdFromStreamUrl(url);
      if (streamExportId) {
        if (req.method === 'POST' && url === `/export/stream/${streamExportId}/part`) {
          const body = await readTextBody(req, EXPORT_STREAM_PART_MAX_BYTES);
          const { seq, lineCount } = streamStore.appendPart(streamExportId, body);
          sendJson(res, 200, { ok: true, seq, lineCount });
          return;
        }

        if (req.method === 'POST' && url === `/export/stream/${streamExportId}/finish`) {
          const body = (await readJsonBody(req)) as {
            taskId?: string;
            mode?: 'full' | 'exclude';
            excludeNodeIds?: string[];
            standaloneFileName?: string;
          };
          const result = await streamStore.finish(streamExportId, {
            taskId: body.taskId,
            mode: body.mode,
            excludeNodeIds: body.excludeNodeIds,
            standaloneFileName: body.standaloneFileName,
          });
          sendJson(res, 200, result);
          return;
        }
      }

      const taskId = taskIdFromUrl(url);
      if (taskId) {
        if (req.method === 'GET' && url === `/tasks/${taskId}`) {
          sendJson(res, 200, store.getTask(taskId));
          return;
        }

        if (req.method === 'PATCH' && url === `/tasks/${taskId}`) {
          const body = (await readJsonBody(req)) as Record<string, unknown>;
          const task = store.patchTask(taskId, {
            current_step: body.current_step as import('./types.js').WizardStep | undefined,
            metadata: body.metadata as import('./types.js').BuilderState['metadata'] | undefined,
            instruction: body.instruction as string | undefined,
            evalSpec: body.evalSpec as import('./types.js').EvalSpec | undefined,
            export: body.export as import('./types.js').BuilderState['export'] | undefined,
          });
          sendJson(res, 200, task);
          return;
        }

        if (req.method === 'DELETE' && url === `/tasks/${taskId}`) {
          store.deleteTask(taskId);
          sendJson(res, 200, { ok: true });
          return;
        }

        if (req.method === 'POST' && url === `/tasks/${taskId}/export`) {
          const body = (await readJsonBody(req)) as {
            snapshot?: unknown;
            mode?: 'full' | 'exclude' | 'copy';
            excludeNodeIds?: string[];
            copyFromTaskId?: string;
            excludeFigmaNodeIds?: string[];
          };
          if (!body.mode) {
            sendError(res, 400, 'mode required');
            return;
          }
          if (body.mode === 'copy') {
            if (!body.copyFromTaskId?.trim()) {
              sendError(res, 400, 'copyFromTaskId required for copy mode');
              return;
            }
            const result = await store.copyExportTask(taskId, {
              copyFromTaskId: body.copyFromTaskId.trim(),
              excludeFigmaNodeIds: body.excludeFigmaNodeIds,
            });
            sendJson(res, 200, result);
            return;
          }
          if (body.snapshot === undefined) {
            sendError(res, 400, 'snapshot required for full/exclude export');
            return;
          }
          const result = await store.exportTask(taskId, {
            snapshot: body.snapshot,
            mode: body.mode,
            excludeNodeIds: body.excludeNodeIds,
          });
          sendJson(res, 200, result);
          return;
        }

        if (req.method === 'POST' && url === `/tasks/${taskId}/assets`) {
          const body = (await readJsonBody(req)) as { filename?: string; dataBase64?: string };
          if (!body.filename || !body.dataBase64) {
            sendError(res, 400, 'filename and dataBase64 required');
            return;
          }
          const asset = store.saveAsset(taskId, body.filename, body.dataBase64);
          sendJson(res, 200, { asset });
          return;
        }

        if (req.method === 'POST' && url === `/tasks/${taskId}/complete`) {
          const result = store.completeTask(taskId);
          sendJson(res, 200, result);
          return;
        }

        if (req.method === 'POST' && url === `/tasks/${taskId}/load-harbor`) {
          const state = store.loadHarborAsDraft(taskId);
          sendJson(res, 200, { task: state });
          return;
        }
      }

      sendError(res, 404, 'Not found');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.startsWith('NOT_FOUND') ? 404 : msg.startsWith('DUPLICATE') ? 409 : 400;
      sendError(res, status, msg);
    }
  });

  return new Promise<{ server: ReturnType<typeof createServer>; port: number }>((resolve, reject) => {
    server.listen(config.httpPort, config.httpHost, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : config.httpPort;
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}
