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

function parseToolJson(text: string): { ok: boolean; data?: unknown; errorCode?: string; message?: string } {
  return JSON.parse(text) as { ok: boolean; data?: unknown; errorCode?: string; message?: string };
}

describe('mcp-http design context', () => {
  let baseDir: string;
  let closeHttp: () => Promise<void>;
  let port: number;
  let client: Client;

  beforeAll(async () => {
    baseDir = mkdtempSync(join(tmpdir(), 'hfc-p2-'));
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

  it('operations + code paths produce design context with phase-2 CSS contracts', async () => {
    await client.callTool({ name: 'create_new_file', arguments: { name: 'P2' } });

    const ops = await client.callTool({
      name: 'use_figma',
      arguments: {
        operations: [
          {
            operation: 'createNode',
            parentId: 'I2',
            node: {
              type: 'FRAME',
              name: 'Shell',
              x: 0,
              y: 0,
              width: 220,
              height: 140,
              fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
              backgrounds: [{ type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.98 } }],
              clipsContent: true,
              effects: [{ type: 'DROP_SHADOW', offset: { x: 0, y: 2 }, radius: 6, color: { r: 0, g: 0, b: 0, a: 0.2 } }],
              children: [],
            },
          },
          {
            operation: 'createNode',
            parentId: 'I3',
            node: {
              type: 'TEXT',
              name: 'OpsTitle',
              x: 12,
              y: 10,
              width: 160,
              height: 32,
              characters: 'Ops link',
              fontSize: 13,
              styledSegments: [
                {
                  start: 4,
                  end: 8,
                  style: { fontSize: 18, hyperlink: { type: 'URL', url: 'https://example.com/ops' } },
                },
              ],
              rotation: -6,
            },
          },
        ],
      },
    });
    const opsBody = parseToolJson(getToolText(ops)!);
    expect(opsBody.ok).toBe(true);

    const meta = await client.callTool({ name: 'get_metadata', arguments: { nodeId: 'I3' } });
    const metaRoot = parseToolJson(getToolText(meta)!).data as {
      root: { bounds?: unknown; children?: { type: string; textLength?: number; effectTypes?: string[] }[] };
    };
    expect(metaRoot.root.children?.some((c) => c.type === 'TEXT')).toBe(true);

    const design = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: 'I3', includeCss: true, inlineCss: false },
    });
    const d = parseToolJson(getToolText(design)!).data as { html: string; css: string };
    expect(d.html.length).toBeGreaterThan(50);
    expect(d.css.length).toBeGreaterThan(50);
    expect(d.html).toContain('hfc-node-I3');
    expect(d.css + d.html).toContain('box-shadow');
    expect(d.css + d.html).toContain('overflow:hidden');
    expect(d.html + d.css).toContain('example.com/ops');
    expect(d.css + d.html).toMatch(/rotate\(-6deg\)|rotate\(-6/);

    const useCode = await client.callTool({
      name: 'use_figma',
      arguments: {
        skillNames: 'p2',
        code: `
          const f = figma.createFrame();
          f.name = 'CodeShell';
          f.resize(120, 80);
          f.x = 0;
          f.y = 60;
          f.backgrounds = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 1 } }];
          f.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
          f.clipsContent = true;
          f.effects = [{ type: 'DROP_SHADOW', offset: { x: 1, y: 1 }, radius: 4 }];
          figma.currentPage.appendChild(f);
          const t = figma.createText();
          t.name = 'CodeTitle';
          t.characters = 'Code link';
          t.x = 4;
          t.y = 4;
          t.resize(100, 28);
          t.fontSize = 12;
          t.setRangeHyperlink(5, 9, { type: 'URL', url: 'https://example.com/code' });
          f.appendChild(t);
          return { frameId: f.id, textId: t.id };
        `,
      },
    });
    const uc = parseToolJson(getToolText(useCode)!);
    expect(uc.ok).toBe(true);
    const res = uc.data as { result: { frameId: string; textId: string } };
    const frameId = res.result.frameId;

    const design2 = await client.callTool({
      name: 'get_design_context',
      arguments: { nodeId: frameId, includeCss: true, inlineCss: false },
    });
    const d2 = parseToolJson(getToolText(design2)!).data as { html: string; css: string };
    expect(d2.css + d2.html).toContain('box-shadow');
    expect(d2.html + d2.css).toContain('example.com/code');

    const shot = await client.callTool({
      name: 'get_screenshot',
      arguments: { nodeId: 'I3', format: 'png', scale: 1, background: 'white' },
    });
    const img = getToolImage(shot);
    expect(Buffer.from(img.data, 'base64').length).toBeGreaterThan(1000);

    const previewRes = await fetch(`http://127.0.0.1:${String(port)}/debug/preview`);
    const previewHtml = await previewRes.text();
    expect(previewHtml).toContain('hfc-node-I3');
    expect(previewHtml).toContain(`hfc-node-${frameId}`);
  });
});
