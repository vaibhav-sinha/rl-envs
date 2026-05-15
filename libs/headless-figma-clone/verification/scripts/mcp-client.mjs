import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * @param {unknown} result
 */
export function getToolText(result) {
  if (result === null || typeof result !== 'object' || !('content' in result)) {
    throw new Error('tool result: expected object with content');
  }
  const content = /** @type {unknown[]} */ (result.content);
  for (const item of content) {
    if (
      item !== null &&
      typeof item === 'object' &&
      'type' in item &&
      item.type === 'text' &&
      'text' in item &&
      typeof item.text === 'string'
    ) {
      return item.text;
    }
  }
  throw new Error('tool result: no text content block');
}

/**
 * @param {unknown} result
 */
export function getToolImage(result) {
  if (result === null || typeof result !== 'object' || !('content' in result)) {
    throw new Error('tool result: expected object with content');
  }
  const content = /** @type {unknown[]} */ (result.content);
  for (const item of content) {
    if (
      item !== null &&
      typeof item === 'object' &&
      'type' in item &&
      item.type === 'image' &&
      'data' in item &&
      typeof item.data === 'string'
    ) {
      const raw = /** @type {{ data: string; mimeType?: string; _meta?: { width?: number; height?: number } }} */ (
        item
      );
      return {
        data: raw.data,
        mimeType: raw.mimeType ?? 'image/png',
        meta: raw._meta ?? {},
      };
    }
  }
  throw new Error('tool result: no image content block');
}

/**
 * @param {string} baseUrl e.g. http://127.0.0.1:3847
 */
export async function connectMcp(baseUrl) {
  const url = new URL(baseUrl);
  url.pathname = '/mcp';
  const client = new Client({ name: 'hfc-verify-run', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(url));
  return client;
}

/**
 * Clone: { ok, data: { result } }; Figma plugin: { ok, result }.
 * @param {string} text
 */
export function parseUseFigmaResult(text) {
  const body = JSON.parse(text);
  if (!body.ok) {
    const msg =
      body.message ??
      body.error?.message ??
      (typeof body.error === 'string' ? body.error : JSON.stringify(body));
    throw new Error(msg || 'use_figma failed');
  }
  const result = body.data?.result ?? body.result;
  const rootId = result?.rootId;
  if (typeof rootId !== 'string' || !rootId) {
    throw new Error(`use_figma missing result.rootId: ${text.slice(0, 500)}`);
  }
  return { rootId, result };
}

/**
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @param {string} nodeId
 * @param {{ figma?: boolean; background?: string; maxDimension?: number }} opts
 */
export async function captureScreenshot(client, nodeId, opts = {}) {
  const args = opts.figma
    ? {
        fileKey: 'active',
        nodeId,
        // Match clone 1:1 pixel size: ScenarioRoot is 480×360, so cap export scale at 480px.
        maxDimension: opts.maxDimension ?? 480,
      }
    : {
        nodeId,
        format: 'png',
        scale: 1,
        background: opts.background ?? 'white',
      };
  const shot = await client.callTool({ name: 'get_screenshot', arguments: args });
  return getToolImage(shot);
}
