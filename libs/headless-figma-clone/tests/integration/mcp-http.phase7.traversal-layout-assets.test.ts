import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../../src/config/loadConfig.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createHttpServer } from '../../src/server/createHttpServer.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { getToolText, getToolImage } from '../helpers/toolResult.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseToolJson(text: string): { ok: boolean; data?: unknown; errorCode?: string; message?: string } {
  return JSON.parse(text) as { ok: boolean; data?: unknown; errorCode?: string; message?: string };
}

function normalizeHfcIds(s: string): string {
  let n = 0;
  const m = new Map<string, string>();
  return s.replace(/\bI[0-9]+\b/g, (id) => {
    if (!m.has(id)) m.set(id, `__${String(n++)}`);
    return m.get(id)!;
  });
}

describe('mcp-http Phase 7 traversal layout assets', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-p7mcp-'));
    process.env.HFC_WORKSPACE_DIR = join(baseDir, 'ws');
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';
    process.env.HFC_ALLOW_DEBUG = '0';
    delete process.env.HFC_ALLOW_NETWORK;
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

  it('script path: findAll, createAutoLayout, createImage, loadFontAsync', async () => {
    const fixture = join(__dirname, '../fixtures/phase7-layout-sizing.hfc.json');
    const open = await client.callTool({
      name: 'open_file',
      arguments: { path: fixture },
    });
    const openParsed = parseToolJson(getToolText(open));
    expect(openParsed.ok).toBe(true);

    const script = `
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      const png = new Uint8Array([137,80,78,71,13,10,26,10]);
      const img = figma.createImage(png);
      const row = figma.createAutoLayout();
      row.name = 'Script Row';
      row.resize(240, 64);
      const fill = figma.createRectangle();
      fill.name = 'Fill';
      fill.resize(80, 40);
      fill.layoutSizingHorizontal = 'FILL';
      const hug = figma.createRectangle();
      hug.name = 'Hug';
      hug.resize(50, 40);
      hug.layoutSizingHorizontal = 'HUG';
      row.appendChild(fill);
      row.appendChild(hug);
      figma.currentPage.appendChild(row);
      const rects = figma.currentPage.findAll({ types: ['RECTANGLE'] });
      return { imageHash: img.hash, rectCount: rects.length, missingFont: figma.hasMissingFont() };
    `;

    const run = await client.callTool({ name: 'use_figma', arguments: { code: script } });
    const runParsed = parseToolJson(getToolText(run));
    expect(runParsed.ok).toBe(true);
    const result = (runParsed.data as { result?: { imageHash?: string; rectCount?: number; missingFont?: boolean } })
      ?.result;
    expect(result?.imageHash).toMatch(/^[a-f0-9]{64}$/);
    expect((result?.rectCount ?? 0) >= 2).toBe(true);
    expect(result?.missingFont).toBe(false);

    const meta = await client.callTool({ name: 'get_metadata', arguments: { nodeId: 'I2' } });
    const metaParsed = parseToolJson(getToolText(meta));
    expect(metaParsed.ok).toBe(true);

    const dc = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3', includeCss: true, inlineCss: true },
    });
    const dcParsed = parseToolJson(getToolText(dc));
    expect(dcParsed.ok).toBe(true);
    const html = String((dcParsed.data as { html?: string })?.html ?? '');
    expect(html).toContain('display:flex');
    expect(html).toMatch(/flex:\s*1\s+1/);

    const shot = await client.callTool({
      name: 'get_screenshot',
      arguments: { nodeId: 'I3', scale: 1 },
    });
    const img = getToolImage(shot);
    expect(Buffer.from(img.data, 'base64').length).toBeGreaterThan(300);
  });

  it('operations path matches layout fixture compile contracts', async () => {
    const fixture = join(__dirname, '../fixtures/phase7-layout-sizing.hfc.json');
    await client.callTool({ name: 'open_file', arguments: { path: fixture } });
    const dc = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3', includeCss: true, inlineCss: true },
    });
    const dcParsed = parseToolJson(getToolText(dc));
    expect(dcParsed.ok).toBe(true);
    const html = String((dcParsed.data as { html?: string })?.html ?? '');
    const css = String((dcParsed.data as { css?: string })?.css ?? '');
    const norm = normalizeHfcIds(html + css);
    expect(norm).toContain('display:flex');
    expect(norm).toMatch(/flex:\s*1\s+1/);
  });

  it('createImageAsync rejects when network policy off', async () => {
    await client.callTool({ name: 'create_new_file', arguments: { name: 'NetDeny' } });
    const script = `
      try {
        await figma.createImageAsync('https://example.com/x.png');
        return 'unexpected-ok';
      } catch (e) {
        return e.message;
      }
    `;
    const run = await client.callTool({ name: 'use_figma', arguments: { code: script } });
    const runParsed = parseToolJson(getToolText(run));
    expect(runParsed.ok).toBe(true);
    const msg = String((runParsed.data as { result?: string })?.result ?? '');
    expect(msg.toLowerCase()).toMatch(/disabled|network/);
  });
});
