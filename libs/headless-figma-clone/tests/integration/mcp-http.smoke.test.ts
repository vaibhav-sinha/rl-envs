import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
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
        code: `
          const f = figma.createFrame();
          f.name = 'Hero';
          f.resize(640, 480);
          f.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.2 } }];
          f.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
          f.strokeWeight = 2;
          figma.currentPage.appendChild(f);
        `,
      },
    });
    const useText = getToolText(use);
    expect(useText).toBeTruthy();
    const useBody = parseToolJson(useText!);
    expect(useBody.ok).toBe(true);
    expect((useBody.data as { touchedNodeIds: string[] }).touchedNodeIds).toContain('I3');

    const metaPages = await client.callTool({ name: 'get_metadata', arguments: {} });
    const pagesBody = parseToolJson(getToolText(metaPages)!);
    expect(pagesBody.ok).toBe(true);
    const pages = (pagesBody.data as { pages: { id: string; name: string }[] }).pages;
    expect(pages.some((p) => p.id === 'I2')).toBe(true);

    const meta = await client.callTool({ name: 'get_metadata', arguments: { nodeId: 'I2' } });
    const mBody = parseToolJson(getToolText(meta)!);
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

    const previewRes = await fetch(`http://127.0.0.1:${String(port)}/preview`);
    expect(previewRes.ok).toBe(true);
    const previewHtml = await previewRes.text();
    expect(previewHtml).toContain('hfc-node-I3');
    expect(previewHtml).toContain(`hfc-node-${codeFrameId}`);
  });

  it('use_figma records detached nodes in issues.hfc.json', async () => {
    const created = await client.callTool({
      name: 'create_new_file',
      arguments: { name: 'IssuesSmoke' },
    });
    const filePath = (parseToolJson(getToolText(created)!).data as { filePath: string }).filePath;
    const issuesPath = join(dirname(filePath), 'issues.hfc.json');
    const commandsBefore = existsSync(issuesPath)
      ? (JSON.parse(readFileSync(issuesPath, 'utf8')) as { commands?: unknown[] }).commands?.length ?? 0
      : 0;

    const orphan = await client.callTool({
      name: 'use_figma',
      arguments: {
        code: `
          const f = figma.createFrame();
          f.name = 'Orphan';
          f.resize(100, 50);
        `,
      },
    });
    const orphanBody = parseToolJson(getToolText(orphan)!);
    expect(orphanBody.ok).toBe(true);
    expect((orphanBody.data as { detachedCount: number }).detachedCount).toBe(1);
    expect(existsSync(issuesPath)).toBe(true);
    const issues = JSON.parse(readFileSync(issuesPath, 'utf8')) as {
      detached: unknown[];
      commands: Array<{ success: boolean }>;
    };
    expect(issues.detached.length).toBeGreaterThanOrEqual(1);
    expect(issues.detached.at(-1)).toMatchObject({ type: 'FRAME', name: 'Orphan' });
    expect(issues.commands).toHaveLength(commandsBefore + 1);
    expect(issues.commands[issues.commands.length - 1].success).toBe(true);
  });

  it('use_figma records command success and failure in issues.hfc.json', async () => {
    const created = await client.callTool({
      name: 'create_new_file',
      arguments: { name: 'CommandIssuesSmoke' },
    });
    const filePath = (parseToolJson(getToolText(created)!).data as { filePath: string }).filePath;
    const issuesPath = join(dirname(filePath), 'issues.hfc.json');
    const commandsBefore = existsSync(issuesPath)
      ? (JSON.parse(readFileSync(issuesPath, 'utf8')) as { commands?: unknown[] }).commands?.length ?? 0
      : 0;

    const bad = await client.callTool({
      name: 'use_figma',
      arguments: { code: 'this is not valid javascript {{{' },
    });
    expect(bad.isError).toBe(true);

    const ok = await client.callTool({
      name: 'use_figma',
      arguments: {
        code: `
          const f = figma.createFrame();
          f.name = 'Ok';
          f.resize(80, 40);
          figma.currentPage.appendChild(f);
        `,
      },
    });
    const okBody = parseToolJson(getToolText(ok)!);
    expect(okBody.ok).toBe(true);

    expect(existsSync(issuesPath)).toBe(true);
    const issues = JSON.parse(readFileSync(issuesPath, 'utf8')) as {
      commands: Array<{ success: boolean; errorCode?: string }>;
    };
    expect(issues.commands).toHaveLength(commandsBefore + 2);
    expect(issues.commands[commandsBefore].success).toBe(false);
    expect(issues.commands[commandsBefore].errorCode).toBeDefined();
    expect(issues.commands[commandsBefore + 1].success).toBe(true);
  });
});
