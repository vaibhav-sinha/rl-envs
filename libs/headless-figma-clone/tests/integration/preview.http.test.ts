import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createHttpServer } from '../../src/server/createHttpServer.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const MULTI_PAGE_FIXTURE = {
  schemaVersion: 1,
  fileKey: 'MULTIPAGE01',
  fileName: 'MultiPage',
  nextInternalId: 6,
  document: {
    id: 'I1',
    type: 'DOCUMENT',
    name: 'Document',
    children: [
      {
        id: 'I2',
        type: 'PAGE',
        name: 'Page Alpha',
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        children: [
          {
            id: 'I3',
            type: 'FRAME',
            name: 'AlphaFrame',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            children: [],
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
          },
        ],
      },
      {
        id: 'I5',
        type: 'PAGE',
        name: 'Page Beta',
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        children: [
          {
            id: 'I4',
            type: 'FRAME',
            name: 'BetaFrame',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            children: [],
            fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }],
          },
        ],
      },
    ],
  },
};

describe('HTTP /preview', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let fixturePath: string;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-preview-http-'));
    const ws = join(baseDir, 'ws');
    process.env.HFC_WORKSPACE_DIR = ws;
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';

    mkdirSync(ws, { recursive: true });
    fixturePath = join(ws, 'multi-page.hfc.json');
    writeFileSync(fixturePath, JSON.stringify(MULTI_PAGE_FIXTURE));

    const config = loadConfig({ version: 'test', cliInitialFile: null });
    const logger = createConsoleLogger('error');
    const persistence = new JsonPersistence();
    const engine = new DocumentEngine({ persistence, logger });
    const started = await createHttpServer({ config, engine, logger });
    closeHttp = started.close;
    port = started.port;

    const activate = new URL(`http://127.0.0.1:${String(port)}/files/active`);
    activate.searchParams.set('path', fixturePath);
    const res = await fetch(activate);
    expect(res.ok).toBe(true);
  });

  afterAll(async () => {
    await closeHttp?.();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('GET /preview includes toolbar and default page content', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/preview`);
    expect(res.ok).toBe(true);
    const html = await res.text();
    expect(html).toContain('hfc-font-faces');
    expect(html).toContain('@font-face');
    expect(html).toContain('Inter-Regular.woff2');
    expect(html).toContain('hfc-preview-toolbar');
    expect(html).toContain('hfc-page-select');
    expect(html).toContain('Page Alpha');
    expect(html).toContain('Page Beta');
    expect(html).toContain('hfc-node-I3');
    expect(html).not.toContain('hfc-node-I4');
  });

  it('GET /preview?pageId= switches to another page', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/preview?pageId=I5`);
    expect(res.ok).toBe(true);
    const html = await res.text();
    expect(html).toContain('hfc-node-I4');
    expect(html).not.toContain('hfc-node-I3');
    expect(html).toContain('value="I5" selected');
  });

  it('GET /fonts/inter serves woff2 files', async () => {
    const res = await fetch(`http://127.0.0.1:${String(port)}/fonts/inter/Inter-Regular.woff2`);
    expect(res.ok).toBe(true);
    expect(res.headers.get('content-type')).toBe('font/woff2');
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it('preview is available without debug flag', async () => {
    expect(process.env.HFC_ALLOW_DEBUG).toBeUndefined();
    const res = await fetch(`http://127.0.0.1:${String(port)}/preview`);
    expect(res.status).toBe(200);
  });
});
