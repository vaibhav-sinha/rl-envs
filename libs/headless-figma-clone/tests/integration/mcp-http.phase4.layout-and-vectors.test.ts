import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../../src/config/loadConfig.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createHttpServer } from '../../src/server/createHttpServer.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { getToolImage, getToolText } from '../helpers/toolResult.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseToolJson(text: string): { ok: boolean; data?: Record<string, unknown>; errorCode?: string } {
  return JSON.parse(text) as { ok: boolean; data?: Record<string, unknown>; errorCode?: string };
}

describe('mcp-http phase4 layout, mask, boolean, vector, blur', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-p4-'));
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

  it('open_file exit fixture + get_design_context includes flex, grid, mask, boolean, vector, backdrop blur', async () => {
    const src = resolve(__dirname, '../fixtures/phase4-nav-grid-mask.json');
    const exitAbs = join(baseDir, 'phase4-exit.hfc.json');
    copyFileSync(src, exitAbs);

    const opened = await client.callTool({ name: 'open_file', arguments: { path: exitAbs } });
    const oText = getToolText(opened);
    expect(oText).toBeTruthy();
    expect(parseToolJson(oText!).ok).toBe(true);

    const dc = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3', includeCss: true, inlineCss: true },
    });
    const dcText = getToolText(dc);
    expect(dcText).toBeTruthy();
    const dcJson = parseToolJson(dcText!) as { ok: boolean; data?: { html: string; css: string } };
    expect(dcJson.ok).toBe(true);
    const blob = (dcJson.data?.html ?? '') + (dcJson.data?.css ?? '');
    expect(blob).toContain('display:flex');
    expect(blob).not.toContain('hfc-layout-grid-overlay');
    expect(blob).toContain('hfc-mask-wrap');
    expect(blob).toContain('hfc-boolean-svg');
    expect(blob).toContain('hfc-vector-svg');
    expect(blob).toMatch(/backdrop-filter:\s*blur\(10px\)/);

    const shot = await client.callTool({
      name: 'get_screenshot',
      arguments: { nodeId: 'I3', format: 'png', scale: 1, background: 'white' },
    });
    const img = getToolImage(shot);
    expect(Buffer.from(img.data, 'base64').length).toBeGreaterThan(500);

    const previewRes = await fetch(`http://127.0.0.1:${String(port)}/debug/preview`);
    const previewHtml = await previewRes.text();
    expect(previewHtml).toContain('hfc-node-I3');
  });

  it('use_figma creates auto-layout frame and vector; design context reflects flex', async () => {
    await client.callTool({ name: 'create_new_file', arguments: { name: 'P4Ops' } });

    const ops = await client.callTool({
      name: 'use_figma',
      arguments: {
        operations: [
          {
            operation: 'createNode',
            parentId: 'I2',
            node: {
              type: 'FRAME',
              name: 'Row',
              x: 0,
              y: 0,
              width: 180,
              height: 50,
              fills: [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.98 } }],
              layoutMode: 'HORIZONTAL',
              itemSpacing: 10,
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 8,
              paddingBottom: 8,
            },
          },
          {
            operation: 'createNode',
            parentId: 'I3',
            node: {
              type: 'VECTOR',
              name: 'Tri',
              x: 4,
              y: 4,
              width: 32,
              height: 28,
              vectorPaths: [{ windingRule: 'NONZERO', data: 'M16,2 L30,26 L2,26 Z' }],
              fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.6, b: 0.4 } }],
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
    const dcJson = parseToolJson(getToolText(dc)!) as { ok: boolean; data?: { html: string } };
    expect(dcJson.ok).toBe(true);
    const html = dcJson.data?.html ?? '';
    expect(html).toContain('display:flex');
    expect(html).toContain('hfc-vector-svg');
    expect(html).toContain('viewBox="0 0 28 24"');
  });
});
