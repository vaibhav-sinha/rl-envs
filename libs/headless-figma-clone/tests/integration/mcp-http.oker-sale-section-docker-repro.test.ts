/**
 * TEMP: Reproduce docker agent `use_figma` for oker-create-sale-section.
 * Copies task design + assets into a temp workspace, boots HFC like the task
 * entrypoint (`--file` preload, `HFC_PREVIEW_ON_LOAD=0`), runs the exact MCP call.
 *
 * Run: npm test -- tests/integration/mcp-http.oker-sale-section-docker-repro.test.ts
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  reserveLocalPort,
  spawnHfcBootstrapServer,
  spawnHfcHttpServer,
  type SpawnedHfcHttp,
} from '../helpers/spawnHfcHttpServer.js';
import { getToolText } from '../helpers/toolResult.js';

const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/tasks/oker-create-sale-section/environment/design.hfc.json'
);

/** Exact agent script from failed docker `Figma-use_figma` (tool_1e687a7f-9eb1-4e4b-89b9-ea80bef6541). */
export const AGENT_SALE_SECTION_CODE = `
await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === 'Final design'));
await figma.loadFontAsync({ family: 'Barlow', style: 'SemiBold' });
await figma.loadFontAsync({ family: 'Barlow', style: 'Regular' });
await figma.loadFontAsync({ family: 'Barlow', style: 'Bold' });

const parentFrame = await figma.getNodeByIdAsync('I9142');
const createdNodeIds = [];

const saleSection = figma.createAutoLayout('VERTICAL', {
  name: 'Sale - Bundle Deals',
  itemSpacing: 12,
  paddingTop: 20,
  paddingBottom: 20,
  fills: [{ type: 'SOLID', color: { r: 1, g: 0.92, b: 0.88 } }],
});
parentFrame.insertChild(1, saleSection);
createdNodeIds.push(saleSection.id);

const urgencyBanner = figma.createAutoLayout('HORIZONTAL', {
  name: 'Urgency Banner',
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 16,
  paddingRight: 16,
  cornerRadius: 8,
  fills: [{ type: 'SOLID', color: { r: 0.75, g: 0.12, b: 0.1 } }],
});
saleSection.appendChild(urgencyBanner);
createdNodeIds.push(urgencyBanner.id);

const urgencyText = figma.createText();
await figma.loadFontAsync({ family: 'Barlow', style: 'SemiBold' });
urgencyText.fontName = { family: 'Barlow', style: 'SemiBold' };
urgencyText.characters = 'Only 12 bundle deals left — selling fast!';
urgencyText.fontSize = 13;
urgencyText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
urgencyBanner.appendChild(urgencyText);
createdNodeIds.push(urgencyText.id);

return { createdNodeIds, ok: true };
`.trim();

function setupDesignInTemp(): { baseDir: string; designPath: string; workspaceDir: string } {
  const baseDir = mkdtempSync(join(tmpdir(), 'hfc-oker-sale-repro-'));
  const workspaceDir = join(baseDir, 'ws');
  mkdirSync(workspaceDir, { recursive: true });
  const designPath = join(workspaceDir, 'design.hfc.json');
  copyFileSync(designFixturePath, designPath);
  const assetsFixture = join(dirname(designFixturePath), 'design.hfc.assets');
  const assetsDest = join(workspaceDir, 'design.hfc.assets');
  if (existsSync(assetsFixture)) {
    cpSync(assetsFixture, assetsDest, { recursive: true });
  }
  return { baseDir, designPath, workspaceDir };
}

function parseToolJson(text: string): {
  ok: boolean;
  data?: unknown;
  errorCode?: string;
  message?: string;
} {
  return JSON.parse(text) as {
    ok: boolean;
    data?: unknown;
    errorCode?: string;
    message?: string;
  };
}

async function mcpCall(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: true; text: string; isError?: boolean } | { ok: false; error: string }> {
  try {
    const result = await client.callTool({ name, arguments: args });
    return { ok: true, text: getToolText(result), isError: result.isError === true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function logReproFailure(label: string, server: SpawnedHfcHttp, text: string, body?: unknown): void {
  // eslint-disable-next-line no-console -- TEMP repro diagnostics
  console.error(`\n=== ${label} ===`);
  if (body !== undefined) console.error(JSON.stringify(body, null, 2));
  console.error('raw tool text (first 4k):', text.slice(0, 4000));
  console.error('HFC stderr tail:', server.stderr().slice(-8000));
}

describe('oker-create-sale-section fixture', () => {
  it('design.hfc.json exists (~340MB on disk)', () => {
    expect(existsSync(designFixturePath)).toBe(true);
  });
});

/** Mirrors docker entrypoint: `node cli.js --transport http --file $HFC_INITIAL_FILE` + preview off. */
describe('docker-like MCP (--file preload, preview off, default Node heap)', () => {
  let baseDir: string;
  let designPath: string;
  let workspaceDir: string;
  let server: SpawnedHfcHttp;
  let client: Client;

  beforeAll(async () => {
    ({ baseDir, designPath, workspaceDir } = setupDesignInTemp());
    const port = await reserveLocalPort();
    server = await spawnHfcHttpServer({
      port,
      initialFile: designPath,
      workspaceDir,
      extraEnv: { HFC_PREVIEW_ON_LOAD: '0' },
    });
    client = new Client({ name: 'vitest-oker-sale-docker', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${server.baseUrl}/mcp`)));
  }, 600_000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
    await server?.close();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('health stays up after large design preload', async () => {
    expect((await fetch(`${server.baseUrl}/health`)).ok).toBe(true);
    expect(server.child.exitCode).toBeNull();
  }, 600_000);

  it('agent sale-section use_figma succeeds or prints structured failure', async () => {
    const use = await mcpCall(client, 'use_figma', {
      skillNames: 'figma-use',
      code: AGENT_SALE_SECTION_CODE,
    });

    if (!use.ok) {
      logReproFailure('MCP transport error', server, use.error);
      expect(use.ok, use.error).toBe(true);
      return;
    }

    const body = parseToolJson(use.text);
    if (use.isError || !body.ok) {
      logReproFailure('use_figma tool error', server, use.text, body);
    }

    expect(use.isError, use.text.slice(0, 2000)).toBeFalsy();
    expect(body.ok, body.message ?? body.errorCode).toBe(true);

    const data = body.data as {
      result?: { createdNodeIds?: string[]; ok?: boolean };
    };
    expect(data.result?.ok).toBe(true);
    expect((data.result?.createdNodeIds ?? []).length).toBeGreaterThanOrEqual(3);
    expect((await fetch(`${server.baseUrl}/health`)).ok).toBe(true);
  }, 600_000);
});

/** Current oker-create-sale-section Dockerfile: no HFC_PREVIEW_ON_LOAD (preview compiles at startup). */
describe('docker Dockerfile as-shipped (preview ON at load)', () => {
  let baseDir: string;
  let designPath: string;
  let workspaceDir: string;
  let server: SpawnedHfcHttp;
  let client: Client;

  beforeAll(async () => {
    ({ baseDir, designPath, workspaceDir } = setupDesignInTemp());
    const port = await reserveLocalPort();
    server = await spawnHfcHttpServer({
      port,
      initialFile: designPath,
      workspaceDir,
    });
    client = new Client({ name: 'vitest-oker-sale-preview-on', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${server.baseUrl}/mcp`)));
  }, 900_000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
    await server?.close();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('use_figma after eager preview compile (matches missing env in task Dockerfile)', async () => {
    const use = await mcpCall(client, 'use_figma', {
      skillNames: 'figma-use',
      code: AGENT_SALE_SECTION_CODE,
    });
    if (!use.ok) {
      logReproFailure('preview-on: MCP transport error', server, use.error);
      expect(use.ok, use.error).toBe(true);
      return;
    }
    const body = parseToolJson(use.text);
    if (use.isError || !body.ok) {
      logReproFailure('preview-on: use_figma tool error', server, use.text, body);
    }
    expect(use.isError, use.text.slice(0, 2000)).toBeFalsy();
    expect(body.ok, body.message ?? body.errorCode).toBe(true);
    expect(server.child.exitCode).toBeNull();
  }, 900_000);
});

/** Documents 512MB bootstrap OOM on ~340MB JSON (sale-section is 3× max-otp file size). */
describe('512MB bootstrap preload (expected OOM on this fixture)', () => {
  it('bootstrap exits before ready when heap capped at 512MB', async () => {
    const { baseDir, designPath } = setupDesignInTemp();
    const port = await reserveLocalPort();
    let server: SpawnedHfcHttp | undefined;
    try {
      server = await spawnHfcBootstrapServer({
        port,
        designPath,
        maxOldSpaceSizeMb: 512,
        extraEnv: { HFC_PREVIEW_ON_LOAD: '0' },
      });
      expect.fail('expected bootstrap to OOM');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).toMatch(/bootstrap exited \(code 134\)/);
    } finally {
      await server?.close();
      rmSync(baseDir, { recursive: true, force: true });
    }
  }, 120_000);
});
