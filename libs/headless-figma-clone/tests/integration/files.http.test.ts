import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createHttpServer } from '../../src/server/createHttpServer.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('HTTP /files and /files/active', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let engine: DocumentEngine;
  let pathA: string;
  let pathB: string;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-files-http-'));
    const ws = join(baseDir, 'ws');
    process.env.HFC_WORKSPACE_DIR = ws;
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';

    const config = loadConfig({ version: 'test', cliInitialFile: null });
    const logger = createConsoleLogger('error');
    const persistence = new JsonPersistence();
    engine = new DocumentEngine({ persistence, phase: 1, logger });
    const started = await createHttpServer({ config, engine, logger });
    closeHttp = started.close;
    port = started.port;

    const a = await engine.createEmptyFile({ fileName: 'Alpha' });
    pathA = a.filePath;
    const b = await engine.createEmptyFile({ fileName: 'Beta' });
    pathB = b.filePath;
  });

  afterAll(async () => {
    await closeHttp?.();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('lists files with setActiveUrl and marks active file', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/files`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      workspaceDir: string;
      files: Array<{
        filePath: string;
        fileKey: string;
        fileName: string;
        active: boolean;
        setActiveUrl: string;
      }>;
    };
    expect(body.files.length).toBe(2);
    for (const f of body.files) {
      expect(f.setActiveUrl).toContain('/files/active?path=');
      expect(decodeURIComponent(new URL(f.setActiveUrl).searchParams.get('path')!)).toBe(f.filePath);
    }
    const activeCount = body.files.filter((f) => f.active).length;
    expect(activeCount).toBe(1);
    expect(body.files.find((f) => f.filePath === pathB)?.active).toBe(true);
  });

  it('GET /files/active switches active file', async () => {
    const u = new URL(`http://127.0.0.1:${String(port)}/files/active`);
    u.searchParams.set('path', pathA);
    const res = await fetch(u);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { ok: boolean; filePath: string | null };
    expect(body.ok).toBe(true);
    expect(body.filePath).toBe(pathA);

    const list = await fetch(`http://127.0.0.1:${String(port)}/files`);
    const listBody = (await list.json()) as { files: Array<{ filePath: string; active: boolean }> };
    expect(listBody.files.find((f) => f.filePath === pathA)?.active).toBe(true);
    expect(listBody.files.find((f) => f.filePath === pathB)?.active).toBe(false);
  });

  it('rejects path outside workspace', async () => {
    const u = new URL(`http://127.0.0.1:${String(port)}/files/active`);
    u.searchParams.set('path', join(baseDir, 'escape.hfc.json'));
    const res = await fetch(u);
    expect(res.status).toBe(403);
  });
});
