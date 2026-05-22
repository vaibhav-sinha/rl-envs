import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../../src/config/loadConfig.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createHttpServer } from '../../src/server/createHttpServer.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { getToolText } from '../helpers/toolResult.js';

function parseToolJson(text: string): { ok: boolean; data?: unknown; errorCode?: string; message?: string } {
  return JSON.parse(text) as { ok: boolean; data?: unknown; errorCode?: string; message?: string };
}

describe('mcp-http FIFO queue', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-mcp-queue-'));
    const ws = join(baseDir, 'ws');
    process.env.HFC_WORKSPACE_DIR = ws;
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

    await client.callTool({ name: 'create_new_file', arguments: { name: 'Queue' } });
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

  it('parallel use_figma + get_metadata both succeed without supersede abort', async () => {
    const metaP = client.callTool({
      name: 'get_metadata',
      arguments: { nodeId: 'I2', maxDepth: 1 },
    });
    const useP = client.callTool({
      name: 'use_figma',
      arguments: {
        code: `
          const f = figma.createFrame();
          f.name = 'QueuedFrame';
          f.resize(100, 80);
          figma.currentPage.appendChild(f);
          return f.name;
        `,
      },
    });

    const [meta, use] = await Promise.all([metaP, useP]);
    const metaText = getToolText(meta);
    const useText = getToolText(use);
    expect(metaText).toBeTruthy();
    expect(useText).toBeTruthy();
    const metaBody = parseToolJson(metaText!);
    const useBody = parseToolJson(useText!);
    expect(metaBody.ok).toBe(true);
    expect(useBody.ok).toBe(true);
    expect(useBody.message ?? '').not.toMatch(/aborted/i);
    expect((useBody.data as { result: string }).result).toBe('QueuedFrame');

    const use2 = await client.callTool({
      name: 'use_figma',
      arguments: {
        code: `return figma.currentPage.findOne((n) => n.name === 'QueuedFrame')?.name ?? null;`,
      },
    });
    const use2Body = parseToolJson(getToolText(use2)!);
    expect(use2Body.ok).toBe(true);
    expect((use2Body.data as { result: string | null }).result).toBe('QueuedFrame');
  });
});
