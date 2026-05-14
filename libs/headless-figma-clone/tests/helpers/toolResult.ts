/** Narrow MCP `tools/call` results for tests (handles union variants). */

function textFromContentArray(content: unknown): string {
  if (!Array.isArray(content)) {
    throw new Error('tool result: expected content array');
  }
  for (const item of content) {
    if (
      item !== null &&
      typeof item === 'object' &&
      'type' in item &&
      (item as { type: unknown }).type === 'text' &&
      'text' in item &&
      typeof (item as { text: unknown }).text === 'string'
    ) {
      return (item as { text: string }).text;
    }
  }
  throw new Error('tool result: no text content block');
}

/** Accepts any `Client.callTool` return value; reads `content` when present. */
export function getToolText(result: unknown): string {
  if (result === null || typeof result !== 'object') {
    throw new Error('tool result: expected object');
  }
  if (!('content' in result)) {
    throw new Error('tool result: missing content (task-only result?)');
  }
  return textFromContentArray((result as { content: unknown }).content);
}

export interface ToolImageBlock {
  data: string;
  mimeType: string;
  meta: { width?: number; height?: number };
}

function imageFromContentArray(content: unknown): ToolImageBlock {
  if (!Array.isArray(content)) {
    throw new Error('tool result: expected content array');
  }
  for (const item of content) {
    if (
      item !== null &&
      typeof item === 'object' &&
      'type' in item &&
      (item as { type: unknown }).type === 'image' &&
      'data' in item &&
      typeof (item as { data: unknown }).data === 'string' &&
      'mimeType' in item &&
      typeof (item as { mimeType: unknown }).mimeType === 'string'
    ) {
      const raw = item as { data: string; mimeType: string; _meta?: unknown };
      const m = raw._meta;
      const width =
        m !== null && typeof m === 'object' && 'width' in m && typeof (m as { width: unknown }).width === 'number'
          ? (m as { width: number }).width
          : undefined;
      const height =
        m !== null && typeof m === 'object' && 'height' in m && typeof (m as { height: unknown }).height === 'number'
          ? (m as { height: number }).height
          : undefined;
      return { data: raw.data, mimeType: raw.mimeType, meta: { width, height } };
    }
  }
  throw new Error('tool result: no image content block');
}

/** First `image` block from an MCP `tools/call` result (`data` is base64 per MCP). */
export function getToolImage(result: unknown): ToolImageBlock {
  if (result === null || typeof result !== 'object') {
    throw new Error('tool result: expected object');
  }
  if (!('content' in result)) {
    throw new Error('tool result: missing content (task-only result?)');
  }
  return imageFromContentArray((result as { content: unknown }).content);
}
