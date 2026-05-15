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
import { buildVariableDefsPayload } from '../../src/variables/resolution.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { getToolText } from '../helpers/toolResult.js';

function parseToolJson(text: string): { ok: boolean; data?: Record<string, unknown> } {
  return JSON.parse(text) as { ok: boolean; data?: Record<string, unknown> };
}

describe('mcp-http phase8 variables and styles', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;
  let engine: DocumentEngine;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-p8-'));
    process.env.HFC_WORKSPACE_DIR = join(baseDir, 'ws');
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';
    const config = loadConfig({ version: 'test', cliInitialFile: null });
    const logger = createConsoleLogger('error');
    const persistence = new JsonPersistence();
    engine = new DocumentEngine({ persistence, logger });
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

  it('script creates variables/styles and get_variable_defs matches envelope', async () => {
    const created = await client.callTool({ name: 'create_new_file', arguments: { fileName: 'Phase8' } });
    expect(parseToolJson(getToolText(created)!).ok).toBe(true);

    const code = `
      const col = figma.variables.createVariableCollection('Layout');
      const modeId = col.modes[0].id;
      const gap = figma.variables.createVariable('gap', col, 'FLOAT');
      figma.variables.setValueForMode(gap.id, modeId, { type: 'FLOAT', value: 12 });
      const brand = figma.variables.createVariable('brand', col, 'COLOR');
      figma.variables.setValueForMode(brand.id, modeId, { type: 'COLOR', color: { r: 1, g: 0, b: 0 } });

      const frame = figma.createFrame();
      frame.name = 'Row';
      frame.layoutMode = 'HORIZONTAL';
      frame.resize(120, 40);
      figma.currentPage.appendChild(frame);
      frame.setBoundVariable('itemSpacing', gap);

      const p1 = figma.createPaintStyle();
      p1.name = 'First';
      const p2 = figma.createPaintStyle();
      p2.name = 'Second';
      figma.moveLocalPaintStyleAfter(p2, null);

      return {
        gapId: gap.id,
        paintOrder: (await figma.getLocalPaintStylesAsync()).map((s) => s.name),
      };
    `;

    const run = await client.callTool({ name: 'use_figma', arguments: { code } });
    const runText = getToolText(run);
    expect(runText).toBeTruthy();
    const runJson = parseToolJson(runText!) as {
      ok: boolean;
      message?: string;
      errorCode?: string;
      data?: unknown;
    };
    expect(runJson.ok, runJson.message ?? runText!).toBe(true);
    const result = runJson.data && typeof runJson.data === 'object' ? (runJson.data as any).result as { paintOrder?: string[] } : undefined;
    expect(result?.paintOrder).toEqual(['Second', 'First']);

    const file = engine.getActiveFile();
    expect(file?.variableCollections?.length).toBe(1);
    expect(file?.paintStyles?.map((s) => s.name)).toEqual(['Second', 'First']);

    const vd = await client.callTool({ name: 'get_variable_defs', arguments: {} });
    const vdPayload = (parseToolJson(getToolText(vd)!) as any).data as unknown as ReturnType<typeof buildVariableDefsPayload>;
    expect(vdPayload.collections.length).toBe(1);
    expect(vdPayload.collections[0]!.variables.length).toBe(2);

    const fromEngine = buildVariableDefsPayload(file!);
    expect(vdPayload.collections[0]!.variables.map((v) => v.id).sort()).toEqual(
      fromEngine.collections[0]!.variables.map((v) => v.id).sort()
    );
  });
});
