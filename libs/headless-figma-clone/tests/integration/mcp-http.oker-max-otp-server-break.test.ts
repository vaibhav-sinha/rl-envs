/**
 * Regression tests for oker MCP memory fixes (subtree assets + HFC_PREVIEW_ON_LOAD).
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

/** Agent script from cursor-cli (I27 + I1228). */
const AGENT_MAX_OTP_CODE = `
await figma.setCurrentPageAsync(figma.root.children.find(p => p.name === 'Final design'));
const section = figma.getNodeById('I27');
const source = figma.getNodeById('I1228');
const clone = source.clone();
clone.name = 'Onboarding/OTP/MaxAttempts';
clone.x = 1313.25;
clone.y = 1533;
section.appendChild(clone);

const buttons = clone.findAll(n => n.type === 'INSTANCE' && n.name === 'Button');
const resendBtn = buttons.find(n => {
  const texts = n.findAll(t => t.type === 'TEXT' && t.name === 'Button');
  return texts.some(t => /resend/i.test(t.characters));
});

const maxMsg = 'You have reached your max attempts. Retry OTP generation after 15:00 minutes';

if (resendBtn) {
  resendBtn.setProperties({
    State: 'Disabled',
    Text: maxMsg
  });
}

return {
  createdNodeIds: [clone.id],
  cloneId: clone.id,
  resendId: resendBtn?.id,
  position: { x: clone.x, y: clone.y }
};
`.trim();

const AGENT_PING_CODE = `return { ok: true, page: figma.currentPage.name };`;

async function mcpCall(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: true; text: string } | { ok: false; fetchFailed: boolean; error?: string }> {
  try {
    const result = await client.callTool({ name, arguments: args });
    return { ok: true, text: getToolText(result) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, fetchFailed: /fetch failed/i.test(msg), error: msg };
  }
}

function countMaxAttemptsFrames(envelope: {
  document?: { children?: Array<{ children?: unknown[] }> };
}): number {
  let count = 0;
  for (const page of envelope.document?.children ?? []) {
    if (!page || typeof page !== 'object' || !('children' in page)) continue;
    for (const node of page.children ?? []) {
      if (
        node &&
        typeof node === 'object' &&
        'type' in node &&
        'name' in node &&
        (node as { type: string }).type === 'SECTION' &&
        (node as { name: string }).name === 'Onboarding' &&
        'children' in node
      ) {
        for (const child of (node as { children: unknown[] }).children) {
          if (
            child &&
            typeof child === 'object' &&
            'type' in child &&
            'name' in child &&
            (child as { type: string }).type === 'FRAME' &&
            (child as { name: string }).name === 'Onboarding/OTP/MaxAttempts'
          ) {
            count += 1;
          }
        }
      }
    }
  }
  return count;
}

function setupDesignInTemp(opts: { copyAssets: boolean }): { baseDir: string; designPath: string } {
  const baseDir = mkdtempSync(join(tmpdir(), 'hfc-oker-mcp-'));
  const ws = join(baseDir, 'ws');
  mkdirSync(ws, { recursive: true });
  const designPath = join(ws, 'design.hfc.json');
  copyFileSync(designFixturePath, designPath);
  if (opts.copyAssets) {
    const assetsFixture = join(dirname(designFixturePath), 'design.hfc.assets');
    const assetsDest = join(dirname(designPath), 'design.hfc.assets');
    if (existsSync(assetsFixture)) {
      cpSync(assetsFixture, assetsDest, { recursive: true });
    }
  }
  return { baseDir, designPath };
}

describe('oker task fixture integrity', () => {
  it('environment/design.hfc.json has no pre-seeded MaxAttempts frames', () => {
    const envelope = JSON.parse(readFileSync(designFixturePath, 'utf8')) as {
      document?: { children?: Array<{ children?: unknown[] }> };
    };
    expect(countMaxAttemptsFrames(envelope)).toBe(0);
  });
});

describe('oker MCP memory (512MB + assets)', () => {
  let baseDir: string;
  let designPath: string;
  let server: SpawnedHfcHttp;
  let client: Client;

  beforeAll(async () => {
    ({ baseDir, designPath } = setupDesignInTemp({ copyAssets: true }));
    const port = await reserveLocalPort();
    server = await spawnHfcHttpServer({
      port,
      workspaceDir: dirname(designPath),
      maxOldSpaceSizeMb: 512,
      extraEnv: { HFC_PREVIEW_ON_LOAD: '0' },
    });
    client = new Client({ name: 'vitest-oker-512', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${server.baseUrl}/mcp`)));
  }, 180_000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
    await server?.close();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('open_file and get_metadata succeed without OOM (no eager preview)', async () => {
    const opened = await mcpCall(client, 'open_file', { path: designPath });
    expect(opened.ok).toBe(true);

    const meta = await mcpCall(client, 'get_metadata', { nodeId: 'I27', maxDepth: 2 });
    expect(meta.ok).toBe(true);
    expect(server.child.exitCode).toBeNull();
    expect((await fetch(`${server.baseUrl}/health`)).ok).toBe(true);
  }, 180_000);
});

describe('oker MCP memory (task env + assets, 2048MB)', () => {
  let baseDir: string;
  let designPath: string;
  let server: SpawnedHfcHttp;
  let client: Client;

  beforeAll(async () => {
    ({ baseDir, designPath } = setupDesignInTemp({ copyAssets: true }));
    const port = await reserveLocalPort();
    server = await spawnHfcBootstrapServer({
      port,
      designPath,
      maxOldSpaceSizeMb: 2048,
      extraEnv: { HFC_PREVIEW_ON_LOAD: '0' },
    });
    client = new Client({ name: 'vitest-oker-2g', version: '1.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${server.baseUrl}/mcp`)));
  }, 300_000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {
      /* ignore */
    }
    await server?.close();
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('agent clone sequence keeps MCP alive (no fetch failed cascade)', async () => {
    const useArgs = { skillNames: 'figma-use', code: AGENT_MAX_OTP_CODE };
    const first = await mcpCall(client, 'use_figma', useArgs);
    const second = await mcpCall(client, 'use_figma', useArgs);
    const ping = await mcpCall(client, 'use_figma', { code: AGENT_PING_CODE });
    const meta = await mcpCall(client, 'get_metadata', { nodeId: 'I27', maxDepth: 2 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(ping.ok).toBe(true);
    expect(meta.ok).toBe(true);
    expect((await fetch(`${server.baseUrl}/health`)).ok).toBe(true);
  }, 300_000);
});
