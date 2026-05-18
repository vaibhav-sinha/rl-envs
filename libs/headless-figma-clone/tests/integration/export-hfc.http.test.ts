import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createHttpServer } from '../../src/server/createHttpServer.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('POST /import/hfc and /export/hfc', () => {
  let baseDir: string;
  let closeHttp: (() => Promise<void>) | undefined;
  let port: number;
  let snapshot: unknown;
  let ws: string;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-export-http-'));
    ws = join(baseDir, 'ws');
    process.env.HFC_WORKSPACE_DIR = ws;
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';

    snapshot = JSON.parse(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export/minimal-frame.snapshot.json'),
        'utf8'
      )
    );

    const config = loadConfig({ version: 'test', cliInitialFile: null });
    const logger = createConsoleLogger('error');
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger,
    });
    const started = await createHttpServer({ config, engine, logger });
    closeHttp = started.close;
    port = started.port;
  });

  afterAll(async () => {
    await closeHttp?.();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('POST /import/hfc converts without writing workspace file', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/import/hfc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hfcFileName: 'From-Figma-Import', snapshot }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      fileKey: string;
      fileName: string;
      slug: string;
      figmaToHfc: Record<string, string>;
      envelope: { document: { children: { children: { name: string }[] }[] } };
    };
    expect(body.fileName).toBe('From-Figma-Import');
    expect(body.slug).toBe('From-Figma-Import');
    expect(body.fileKey).toBeTruthy();
    const page = body.envelope.document.children[0]!;
    const frame = page.children.find((n) => n.name === 'Card');
    expect(frame).toBeDefined();
    expect(body.figmaToHfc['1:2']).toBe(frame!.id);
    expect(existsSync(join(ws, 'From-Figma-Import.hfc.json'))).toBe(false);
  });

  it('POST /export/hfc?save=true writes .hfc.json to workspace', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/export/hfc?save=true`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hfcFileName: 'From-Figma-Export', snapshot }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { filePath: string; fileKey: string; fileName: string };
    expect(body.fileName).toBe('From-Figma-Export');
    expect(body.filePath).toMatch(/From-Figma-Export\.hfc\.json$/);

    const onDisk = JSON.parse(readFileSync(body.filePath, 'utf8')) as {
      document: { children: { children: { name: string }[] }[] };
    };
    const page = onDisk.document.children[0]!;
    const frame = page.children.find((n) => n.name === 'Card');
    expect(frame).toBeDefined();
  });

  it('POST /export/hfc without save returns import shape', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/export/hfc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hfcFileName: 'No-Save-Export', snapshot }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { slug: string; envelope: unknown };
    expect(body.slug).toBe('No-Save-Export');
    expect(body.envelope).toBeTruthy();
    expect(existsSync(join(ws, 'No-Save-Export.hfc.json'))).toBe(false);
  });

  it('health advertises import and export endpoints', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/health`);
    const body = (await res.json()) as { importEndpoint?: string; exportEndpoint?: string };
    expect(body.importEndpoint).toBe('/import/hfc');
    expect(body.exportEndpoint).toBe('/export/hfc');
  });

  it('allows CORS from null origin (Figma plugin UI)', async () => {
    const preflight = await fetch(`http://127.0.0.1:${String(port)}/import/hfc`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'null',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*');

    const res = await fetch(`http://127.0.0.1:${String(port)}/import/hfc`, {
      method: 'POST',
      headers: {
        Origin: 'null',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hfcFileName: 'Cors-Test', snapshot }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
