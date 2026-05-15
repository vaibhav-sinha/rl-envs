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
import { getToolText } from '../helpers/toolResult.js';

function parseToolJson(text: string): { ok: boolean; data?: unknown; errorCode?: string; message?: string } {
  return JSON.parse(text) as { ok: boolean; data?: unknown; errorCode?: string; message?: string };
}

interface MetaNode {
  id: string;
  type: string;
  name: string;
  children?: MetaNode[];
}

function findNamedFrame(meta: MetaNode, name: string): string | null {
  if (meta.type === 'FRAME' && meta.name === name) return meta.id;
  for (const c of meta.children ?? []) {
    const hit = findNamedFrame(c, name);
    if (hit) return hit;
  }
  return null;
}

function normalizeHfcIds(s: string): string {
  let n = 0;
  const m = new Map<string, string>();
  return s.replace(/\bI[0-9]+\b/g, (id) => {
    if (!m.has(id)) m.set(id, `__${String(n++)}`);
    return m.get(id)!;
  });
}

describe('mcp-http Phase 6 script parity', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-p6mcp-'));
    process.env.HFC_WORKSPACE_DIR = join(baseDir, 'ws');
    process.env.HFC_HTTP_PORT = '0';
    process.env.HFC_HTTP_HOST = '127.0.0.1';
    process.env.HFC_ALLOW_DEBUG = '0';
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

  it('operations vs code produce equivalent design context for boolean + rects', async () => {
    await client.callTool({ name: 'create_new_file', arguments: { name: 'ParA' } });

    const opsBody = await client.callTool({
      name: 'use_figma',
      arguments: {
        operations: [
          {
            operation: 'createNode',
            parentId: 'I2',
            node: {
              type: 'FRAME',
              name: 'ParShell',
              x: 0,
              y: 0,
              width: 200,
              height: 120,
              fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }],
            },
          },
          {
            operation: 'createNode',
            parentId: 'I3',
            node: {
              type: 'RECTANGLE',
              name: 'A',
              x: 10,
              y: 10,
              width: 60,
              height: 50,
              fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
            },
          },
          {
            operation: 'createNode',
            parentId: 'I3',
            node: {
              type: 'RECTANGLE',
              name: 'B',
              x: 30,
              y: 20,
              width: 60,
              height: 50,
              fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }],
            },
          },
          {
            operation: 'createNode',
            parentId: 'I3',
            node: {
              type: 'BOOLEAN_OPERATION',
              name: 'Bool',
              booleanOperation: 'SUBTRACT',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            },
          },
          { operation: 'moveNode', nodeId: 'I4', newParentId: 'I6', index: 0 },
          { operation: 'moveNode', nodeId: 'I5', newParentId: 'I6', index: 1 },
        ],
      },
    });
    const opsParse = parseToolJson(getToolText(opsBody)!);
    expect(opsParse.ok).toBe(true);

    const meta1 = await client.callTool({ name: 'get_metadata', arguments: {} });
    const m1 = parseToolJson(getToolText(meta1)!).data as { root: MetaNode };
    const shell1 = findNamedFrame(m1.root, 'ParShell');
    expect(shell1).toBeTruthy();

    const design1 = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: shell1!, includeCss: true, inlineCss: true },
    });
    const d1 = parseToolJson(getToolText(design1)!).data as { html: string; css: string };

    await client.callTool({ name: 'create_new_file', arguments: { name: 'ParB' } });

    const codeBody = await client.callTool({
      name: 'use_figma',
      arguments: {
        code: `
const shell = figma.createFrame();
shell.name = 'ParShell';
shell.resize(200, 120);
shell.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
figma.currentPage.appendChild(shell);
const a = figma.createRectangle();
a.name = 'A';
a.x = 10;
a.y = 10;
a.resize(60, 50);
a.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
shell.appendChild(a);
const b = figma.createRectangle();
b.name = 'B';
b.x = 30;
b.y = 20;
b.resize(60, 50);
b.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 } }];
shell.appendChild(b);
figma.subtract([a, b], shell);
return {};
`.trim(),
      },
    });
    const codeParse = parseToolJson(getToolText(codeBody)!);
    expect(codeParse.ok).toBe(true);

    const meta2 = await client.callTool({ name: 'get_metadata', arguments: {} });
    const m2 = parseToolJson(getToolText(meta2)!).data as { root: MetaNode };
    const shell2 = findNamedFrame(m2.root, 'ParShell');
    expect(shell2).toBeTruthy();

    const design2 = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: shell2!, includeCss: true, inlineCss: true },
    });
    const d2 = parseToolJson(getToolText(design2)!).data as { html: string; css: string };

    expect(normalizeHfcIds(d1.html)).toBe(normalizeHfcIds(d2.html));
    expect(normalizeHfcIds(d1.css)).toBe(normalizeHfcIds(d2.css));
  });
});
