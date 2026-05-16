import { mkdtempSync, rmSync } from 'node:fs';
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

function parseToolJson(text: string): { ok: boolean; data?: unknown } {
  return JSON.parse(text) as { ok: boolean; data?: unknown };
}

describe('mcp-http page nodeId', () => {
  let baseDir: string;
  let closeHttp: (() => Promise<void>) | undefined;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-page-node-'));
    const ws = join(baseDir, 'ws');
    process.env.HFC_WORKSPACE_DIR = ws;
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';

    const config = loadConfig({ version: 'test', cliInitialFile: null });
    const logger = createConsoleLogger('error');
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger,
    });
    const started = await createHttpServer({ config, engine, logger });
    closeHttp = started.close;
    port = started.port;

    client = new Client({ name: 'vitest', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${String(port)}/mcp`)));
    await client.callTool({ name: 'create_new_file', arguments: { name: 'PageNode' } });
    await client.callTool({
      name: 'use_figma',
      arguments: {
        code: `
const f = figma.createFrame();
f.name = 'Tile';
f.resize(80, 60);
f.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.8, b: 0.2 } }];
figma.currentPage.appendChild(f);
return {};
`.trim(),
      },
    });
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

  it('get_design_context with PAGE id compiles all top-level layers', async () => {
    const design = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I2', includeCss: true, inlineCss: true },
    });
    const body = parseToolJson(getToolText(design)!);
    expect(body.ok).toBe(true);
    const html = (body.data as { html: string }).html;
    expect(html).toMatch(/hfc-node-I\d+/);
  });

  it('get_screenshot with PAGE id captures the page bounds', async () => {
    const shot = await client.callTool({
      name: 'get_screenshot',
      arguments: { nodeId: 'I2', format: 'png', scale: 1 },
    });
    const img = getToolImage(shot);
    expect(img.mimeType).toBe('image/png');
    expect(Buffer.from(img.data, 'base64').length).toBeGreaterThan(100);
  });
});
