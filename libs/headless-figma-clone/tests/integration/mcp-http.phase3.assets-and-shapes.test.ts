import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../../src/config/loadConfig.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createHttpServer } from '../../src/server/createHttpServer.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { getToolText } from '../helpers/toolResult.js';

function parseToolJson(text: string): { ok: boolean; data?: Record<string, unknown>; errorCode?: string } {
  return JSON.parse(text) as { ok: boolean; data?: Record<string, unknown>; errorCode?: string };
}

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAfKm7WQAAAABJRU5ErkJggg==';

describe('mcp-http phase3 assets and shapes', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-p3-'));
    process.env.HFC_WORKSPACE_DIR = join(baseDir, 'ws');
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';
    process.env.HFC_ALLOW_DEBUG = '1';
    const config = loadConfig({ version: 'test', cliInitialFile: null });
    const logger = createConsoleLogger('error');
    const persistence = new JsonPersistence();
    const engine = new DocumentEngine({ persistence, logger });
    const started = await createHttpServer({ config, engine, logger });
    closeHttp = started.close;
    port = started.port;
    client = new Client({ name: 'vitest', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${String(port)}/mcp`)));
  });

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
    await closeHttp?.();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('upload_assets, shapes, GET /assets/:id, and design context', async () => {
    await client.callTool({ name: 'create_new_file', arguments: { name: 'P3Mcp' } });

    const up = await client.callTool({
      name: 'upload_assets',
      arguments: { dataUrl: `data:image/png;base64,${TINY_PNG_B64}` },
    });
    const upText = getToolText(up);
    expect(upText).toBeTruthy();
    const upJson = parseToolJson(upText!);
    expect(upJson.ok).toBe(true);
    const sha = upJson.data?.sha256 as string;
    expect(sha).toMatch(/^[a-f0-9]{64}$/);

    const httpRes = await fetch(`http://127.0.0.1:${String(port)}/assets/${sha}`);
    expect(httpRes.status).toBe(200);
    const buf = Buffer.from(await httpRes.arrayBuffer());
    expect(buf.length).toBeGreaterThan(10);

    const ops = await client.callTool({
      name: 'use_figma',
      arguments: {
        operations: [
          {
            operation: 'createNode',
            parentId: 'I2',
            node: {
              type: 'FRAME',
              name: 'Canvas',
              x: 0,
              y: 0,
              width: 120,
              height: 100,
              fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }],
            },
          },
          {
            operation: 'createNode',
            parentId: 'I3',
            node: {
              type: 'RECTANGLE',
              name: 'ImgRect',
              x: 4,
              y: 4,
              width: 40,
              height: 36,
              fills: [{ type: 'IMAGE', imageHash: sha, scaleMode: 'FILL' }],
            },
          },
          {
            operation: 'createNode',
            parentId: 'I3',
            node: {
              type: 'POLYGON',
              name: 'P',
              x: 50,
              y: 4,
              width: 36,
              height: 36,
              pointCount: 6,
              fills: [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 0.2 } }],
            },
          },
        ],
      },
    });
    const opsText = getToolText(ops);
    expect(opsText).toBeTruthy();
    expect(parseToolJson(opsText!).ok).toBe(true);

    const dc = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3', includeCss: true, inlineCss: true },
    });
    const dcText = getToolText(dc);
    expect(dcText).toBeTruthy();
    const dcJson = parseToolJson(dcText!) as { ok: boolean; data?: { html: string; css: string } };
    expect(dcJson.ok).toBe(true);
    const html = dcJson.data?.html ?? '';
    expect(html).toContain('hfc-node-I3');
    expect(html).toContain('hfc-shape-svg');
    expect(html).toMatch(/data:image\/png;base64,/);
  });

  it('upload_assets accepts filePath to png on disk', async () => {
    await client.callTool({ name: 'create_new_file', arguments: { name: 'P3FileUp' } });
    const pngAbs = join(baseDir, 'tool-upload.png');
    writeFileSync(pngAbs, Buffer.from(TINY_PNG_B64, 'base64'));
    const up = await client.callTool({
      name: 'upload_assets',
      arguments: { filePath: pngAbs },
    });
    const upText = getToolText(up);
    expect(upText).toBeTruthy();
    const upJson = parseToolJson(upText!);
    expect(upJson.ok).toBe(true);
    const sha = upJson.data?.sha256 as string;
    expect(sha).toMatch(/^[a-f0-9]{64}$/);
    const httpRes = await fetch(`http://127.0.0.1:${String(port)}/assets/${sha}`);
    expect(httpRes.status).toBe(200);
  });
});
