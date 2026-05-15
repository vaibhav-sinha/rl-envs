/**
 * Capture clone.png for one scenario via headless-figma-clone MCP HTTP.
 * Usage: node capture-clone-screenshot.mjs <scenarioDir> [baseUrl]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { captureScreenshot, connectMcp, getToolText, parseUseFigmaResult } from './mcp-client.mjs';

const scenarioDir = process.argv[2];
const base = process.argv[3] ?? 'http://127.0.0.1:3847';
if (!scenarioDir) {
  console.error('Usage: node capture-clone-screenshot.mjs <scenarioDir> [baseUrl]');
  process.exit(1);
}

const code = readFileSync(join(scenarioDir, 'script.js'), 'utf8');

const client = await connectMcp(base);
try {
  await client.callTool({ name: 'create_new_file', arguments: { name: 'capture-one' } });
  const run = await client.callTool({ name: 'use_figma', arguments: { code } });
  const { rootId } = parseUseFigmaResult(getToolText(run));
  const img = await captureScreenshot(client, rootId, { background: 'white' });
  const out = join(scenarioDir, 'clone.png');
  writeFileSync(out, Buffer.from(img.data, 'base64'));
  console.log(JSON.stringify({ scenarioDir, rootId, out, width: img.meta.width, height: img.meta.height }));
} finally {
  await client.close();
}
