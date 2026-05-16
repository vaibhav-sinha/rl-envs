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
    engine = new DocumentEngine({ persistence, logger });
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

  it('GET /files returns HTML file browser with file names', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/files`);
    expect(res.ok).toBe(true);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Workspace files');
    expect(html).toContain('Alpha');
    expect(html).toContain('Beta');
    expect(html).toContain('View');
    expect(html).toContain('/files/active?path=');
    expect(html).toContain('redirect=');
    expect(html).toMatch(/redirect=(%2F|\/)preview/);
  });

  it('GET /files/active switches active file (JSON)', async () => {
    const u = new URL(`http://127.0.0.1:${String(port)}/files/active`);
    u.searchParams.set('path', pathA);
    const res = await fetch(u);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { ok: boolean; filePath: string | null };
    expect(body.ok).toBe(true);
    expect(body.filePath).toBe(pathA);

    const list = await fetch(`http://127.0.0.1:${String(port)}/files`);
    const listHtml = await list.text();
    expect(listHtml).toContain('badge-active');
    expect(listHtml).toContain('Alpha');
  });

  it('GET /files/active with redirect loads file and redirects to preview', async () => {
    const u = new URL(`http://127.0.0.1:${String(port)}/files/active`);
    u.searchParams.set('path', pathB);
    u.searchParams.set('redirect', '/preview');
    const res = await fetch(u, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/preview');

    const previewRes = await fetch(`http://127.0.0.1:${String(port)}/preview`);
    expect(previewRes.ok).toBe(true);
    const previewHtml = await previewRes.text();
    expect(previewHtml).toContain('hfc-preview-toolbar');
  });

  it('rejects path outside workspace', async () => {
    const u = new URL(`http://127.0.0.1:${String(port)}/files/active`);
    u.searchParams.set('path', join(baseDir, 'escape.hfc.json'));
    const res = await fetch(u);
    expect(res.status).toBe(403);
  });
});
