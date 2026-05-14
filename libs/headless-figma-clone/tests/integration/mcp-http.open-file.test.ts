import { mkdtempSync, rmSync } from 'node:fs';
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

function parseToolJson(text: string): { ok: boolean; data?: unknown; errorCode?: string; message?: string } {
  return JSON.parse(text) as { ok: boolean; data?: unknown; errorCode?: string; message?: string };
}

describe('mcp-http open_file', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-open-'));
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

  it('open_file loads fixture and get_design_context compiles TEXT', async () => {
    const abs = resolve(__dirname, '../fixtures/phase2-compile-harness.hfc.json');
    const opened = await client.callTool({
      name: 'open_file',
      arguments: { path: abs },
    });
    const oText = getToolText(opened);
    expect(oText).toBeTruthy();
    const oBody = parseToolJson(oText!);
    expect(oBody.ok).toBe(true);

    const design = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3', includeCss: true, inlineCss: false },
    });
    const dText = getToolText(design);
    const dBody = parseToolJson(dText!);
    expect(dBody.ok).toBe(true);
    const html = (dBody.data as { html: string }).html;
    const css = (dBody.data as { css: string }).css;
    expect(html).toContain('hfc-node-I4');
    expect(html).toContain('hfc-hyperlink');
    expect(html + css).toContain('example.com');
  });
});
