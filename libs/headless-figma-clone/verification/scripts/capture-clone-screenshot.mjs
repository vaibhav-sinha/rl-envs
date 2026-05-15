/**
 * Capture clone.png for one scenario via headless-figma-clone MCP HTTP.
 * Usage: node capture-clone-screenshot.mjs <scenarioDir> [baseUrl]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function getToolText(result) {
  for (const item of result.content ?? []) {
    if (item?.type === 'text' && typeof item.text === 'string') return item.text;
  }
  throw new Error('no text in tool result');
}

function getToolImage(result) {
  for (const item of result.content ?? []) {
    if (item?.type === 'image' && typeof item.data === 'string') {
      return { data: item.data, meta: item._meta ?? {} };
    }
  }
  throw new Error('no image in tool result');
}

const scenarioDir = process.argv[2];
const base = process.argv[3] ?? 'http://127.0.0.1:3847';
if (!scenarioDir) {
  console.error('Usage: node capture-clone-screenshot.mjs <scenarioDir> [baseUrl]');
  process.exit(1);
}

const code = readFileSync(join(scenarioDir, 'script.js'), 'utf8');
const url = new URL(base);
url.pathname = '/mcp';

const client = new Client({ name: 'capture-clone', version: '1.0.0' });
await client.connect(new StreamableHTTPClientTransport(url));
try {
  const run = await client.callTool({ name: 'use_figma', arguments: { code } });
  const body = JSON.parse(getToolText(run));
  if (!body.ok) throw new Error(`use_figma failed: ${getToolText(run)}`);
  const rootId = body.data?.result?.rootId;
  if (!rootId) throw new Error(`missing rootId: ${getToolText(run)}`);

  const shot = await client.callTool({
    name: 'get_screenshot',
    arguments: { nodeId: rootId, format: 'png', scale: 1, background: 'white' },
  });
  const img = getToolImage(shot);
  const out = join(scenarioDir, 'clone.png');
  writeFileSync(out, Buffer.from(img.data, 'base64'));
  console.log(JSON.stringify({ scenarioDir, rootId, out, width: img.meta.width, height: img.meta.height }));
} finally {
  await client.close();
}
