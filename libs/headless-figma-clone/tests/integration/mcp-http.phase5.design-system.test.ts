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
import { getToolText } from '../helpers/toolResult.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseToolJson(text: string): { ok: boolean; data?: Record<string, unknown>; errorCode?: string } {
  return JSON.parse(text) as { ok: boolean; data?: Record<string, unknown>; errorCode?: string };
}

describe('mcp-http phase5 design system', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-p5-'));
    process.env.HFC_WORKSPACE_DIR = join(baseDir, 'ws');
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';
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

  it('get_variable_defs + search_design_system + design context on demo file', async () => {
    const src = resolve(__dirname, '../fixtures/phase5-demo.hfc.json');
    const dest = join(baseDir, 'demo.hfc.json');
    copyFileSync(src, dest);

    const opened = await client.callTool({ name: 'open_file', arguments: { path: dest } });
    const oText = getToolText(opened);
    expect(oText).toBeTruthy();
    expect(parseToolJson(oText!).ok).toBe(true);

    const vd = await client.callTool({ name: 'get_variable_defs', arguments: {} });
    const vdText = getToolText(vd);
    expect(vdText).toBeTruthy();
    const vdJson = parseToolJson(vdText!) as { ok: boolean; data?: { version?: number; collections?: unknown[] } };
    expect(vdJson.ok).toBe(true);
    expect(vdJson.data?.version).toBe(1);
    expect(Array.isArray(vdJson.data?.collections)).toBe(true);

    const s1 = await client.callTool({
      name: 'search_design_system',
      arguments: { query: 'Chip', limit: 10 },
    });
    const s2 = await client.callTool({
      name: 'search_design_system',
      arguments: { query: 'Chip', limit: 10 },
    });
    expect(getToolText(s1)).toBe(getToolText(s2));

    const dc = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3', includeCss: true, inlineCss: true },
    });
    const dcText = getToolText(dc);
    expect(dcText).toBeTruthy();
    const dcJson = parseToolJson(dcText!) as { ok: boolean; data?: { html: string; css: string } };
    expect(dcJson.ok).toBe(true);
    const blob = (dcJson.data?.html ?? '') + (dcJson.data?.css ?? '');
    expect(blob).toContain('var(--hfc-var-VV1)');
    expect(blob).toContain('hfc-table');
    expect(blob).toContain('hfc-textpath-svg');
    expect(blob).toContain('hfc-component-instance');
  });

  it('use_figma script creates component instance when component exists', async () => {
    const fixture = resolve(__dirname, '../fixtures/phase5-demo.hfc.json');
    await client.callTool({ name: 'open_file', arguments: { path: fixture } });
    const code = `
      const inst = figma.createComponentInstance("COMP1");
      inst.x = 4; inst.y = 4; inst.width = 96; inst.height = 28;
      figma.currentPage.appendChild(inst);
      return { ok: true };
    `;
    const run = await client.callTool({ name: 'use_figma', arguments: { code } });
    const t = getToolText(run);
    expect(t).toBeTruthy();
    expect(parseToolJson(t!).ok).toBe(true);
  });
});
