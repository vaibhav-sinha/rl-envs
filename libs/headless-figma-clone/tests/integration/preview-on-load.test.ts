import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { reserveLocalPort, spawnHfcHttpServer } from '../helpers/spawnHfcHttpServer.js';
import { getToolText } from '../helpers/toolResult.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';

const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

describe('HFC_PREVIEW_ON_LOAD=0', () => {
  let baseDir: string;
  let server: Awaited<ReturnType<typeof spawnHfcHttpServer>>;
  let client: Client;
  let prevPreview: string | undefined;

  beforeAll(async () => {
    prevPreview = process.env.HFC_PREVIEW_ON_LOAD;
    process.env.HFC_PREVIEW_ON_LOAD = '0';

    baseDir = mkdtempSync(join(tmpdir(), 'hfc-preview-load-'));
    const ws = join(baseDir, 'ws');
    mkdirSync(ws, { recursive: true });
    const designPath = join(ws, 'design.hfc.json');
    copyFileSync(designFixturePath, designPath);
    const assetsFixture = join(dirname(designFixturePath), 'design.hfc.assets');
    const assetsDest = join(dirname(designPath), 'design.hfc.assets');
    if (existsSync(assetsFixture)) {
      cpSync(assetsFixture, assetsDest, { recursive: true });
    }

    const port = await reserveLocalPort();
    server = await spawnHfcHttpServer({
      port,
      workspaceDir: ws,
      initialFile: designPath,
      maxOldSpaceSizeMb: 512,
      extraEnv: { HFC_PREVIEW_ON_LOAD: '0' },
    });

    client = new Client({ name: 'vitest-preview-load', version: '1.0.0' });
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
    if (prevPreview === undefined) delete process.env.HFC_PREVIEW_ON_LOAD;
    else process.env.HFC_PREVIEW_ON_LOAD = prevPreview;
  });

  it('allows 512MB startup with assets when preview compile is skipped', async () => {
    expect(server.child.exitCode).toBeNull();
    const envelope = JSON.parse(readFileSync(designFixturePath, 'utf8'));
    const env = envelope as { fileKey: string };
    const nodeId = resolveHfcNodeIdBySourceFigmaId(envelope, '1621:130309');
    expect(nodeId).toBeTruthy();
    const meta = await client.callTool({
      name: 'get_metadata',
      arguments: { fileKey: env.fileKey, nodeId: nodeId!, maxDepth: 1 },
    });
    const text = getToolText(meta);
    expect(text).toBeTruthy();
    const body = JSON.parse(text!) as { ok: boolean };
    expect(body.ok).toBe(true);
  }, 60_000);
});
