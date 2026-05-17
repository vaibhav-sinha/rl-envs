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
import { getToolImage } from '../helpers/toolResult.js';

describe('screenshot frame dimensions', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-shot-'));
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

  it('PNG pixel size matches frame * scale (±1)', async () => {
    await client.callTool({ name: 'create_new_file', arguments: { name: 'Shot' } });
    await client.callTool({
      name: 'use_figma',
      arguments: {
        code: `
          const f = figma.createFrame();
          f.name = 'Box';
          f.resize(100, 50);
          figma.currentPage.appendChild(f);
        `,
      },
    });
    const scale = 1.75;
    const shot = await client.callTool({
      name: 'get_screenshot',
      arguments: { nodeId: 'I3', format: 'png', scale },
    });
    const img = getToolImage(shot);
    const w = img.meta.width!;
    const h = img.meta.height!;
    expect(Math.abs(w - 100 * scale)).toBeLessThanOrEqual(1);
    expect(Math.abs(h - 50 * scale)).toBeLessThanOrEqual(1);
  });
});
