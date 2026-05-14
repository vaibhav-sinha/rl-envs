import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
import { getToolImage, getToolText } from '../helpers/toolResult.js';

function parseToolJson(text: string): { ok: boolean; data?: unknown; errorCode?: string; message?: string } {
  return JSON.parse(text) as { ok: boolean; data?: unknown; errorCode?: string; message?: string };
}

describe('mcp-http smoke', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-mcp-'));
    const ws = join(baseDir, 'ws');
    process.env.HFC_WORKSPACE_DIR = ws;
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_ALLOW_DEBUG = '1';
    process.env.HFC_HTTP_HOST = '127.0.0.1';

    const config = loadConfig({ version: 'test', cliInitialFile: null });
    const logger = createConsoleLogger('error');
    const persistence = new JsonPersistence();
    const engine = new DocumentEngine({ persistence, phase: 1, logger });
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

  it('lists tools and runs create → frame → metadata → design → screenshot', async () => {
    const listed = await client.listTools();
    const names = new Set(listed.tools.map((t) => t.name));
    expect(names.has('create_new_file')).toBe(true);
    expect(names.has('use_figma')).toBe(true);
    expect(names.has('get_metadata')).toBe(true);
    expect(names.has('get_design_context')).toBe(true);
    expect(names.has('get_screenshot')).toBe(true);

    const created = await client.callTool({
      name: 'create_new_file',
      arguments: { name: 'Smoke' },
    });
    const cText = getToolText(created);
    expect(cText).toBeTruthy();
    const createdBody = parseToolJson(cText!);
    expect(createdBody.ok).toBe(true);
    const filePath = (createdBody.data as { filePath: string }).filePath;
    expect(readFileSync(filePath, 'utf8')).toContain('"type": "DOCUMENT"');

    const use = await client.callTool({
      name: 'use_figma',
      arguments: {
        operations: [
          {
            operation: 'createNode',
            parentId: 'I2',
            node: {
              type: 'FRAME',
              name: 'Hero',
              x: 0,
              y: 0,
              width: 640,
              height: 480,
              fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }],
              strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
              strokeWeight: 2,
            },
          },
        ],
      },
    });
    const useText = getToolText(use);
    expect(useText).toBeTruthy();
    const useBody = parseToolJson(useText!);
    expect(useBody.ok).toBe(true);
    expect((useBody.data as { touchedNodeIds: string[] }).touchedNodeIds).toContain('I3');

    const meta = await client.callTool({ name: 'get_metadata', arguments: {} });
    const mText = getToolText(meta);
    const mBody = parseToolJson(mText!);
    expect(mBody.ok).toBe(true);
    const root = (mBody.data as { root: { id: string; children?: { id: string }[] } }).root;
    const ids = (root.children ?? []).map((c) => c.id);
    expect(ids).toContain('I3');

    const design = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3' },
    });
    const dText = getToolText(design);
    const dBody = parseToolJson(dText!);
    expect(dBody.ok).toBe(true);
    const html = (dBody.data as { html: string }).html;
    expect(html).toContain('hfc-node-I3');

    const shot = await client.callTool({
      name: 'get_screenshot',
      arguments: { nodeId: 'I3', format: 'png', scale: 1 },
    });
    const img = getToolImage(shot);
    expect(img.mimeType).toBe('image/png');
    const buf = Buffer.from(img.data, 'base64');
    expect(buf.length).toBeGreaterThan(1024);

    const useCode = await client.callTool({
      name: 'use_figma',
      arguments: {
        skillNames: 'figma-use',
        code: `
          const f = figma.createFrame();
          f.name = 'CodeHero';
          f.resize(200, 100);
          f.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.5, b: 0.9 } }];
          figma.currentPage.appendChild(f);
          return { createdNodeIds: [f.id] };
        `,
      },
    });
    const ucText = getToolText(useCode);
    const ucBody = parseToolJson(ucText!);
    expect(ucBody.ok).toBe(true);
    expect((ucBody.data as { touchedNodeIds: string[] }).touchedNodeIds.length).toBeGreaterThan(0);
    const codeFrameId = (ucBody.data as { result: { createdNodeIds: string[] } }).result.createdNodeIds[0];
    expect(codeFrameId).toMatch(/^I[0-9]+$/);

    const previewRes = await fetch(`http://127.0.0.1:${String(port)}/debug/preview`);
    expect(previewRes.ok).toBe(true);
    const previewHtml = await previewRes.text();
    expect(previewHtml).toContain('hfc-node-I3');
    expect(previewHtml).toContain(`hfc-node-${codeFrameId}`);
  });
});
