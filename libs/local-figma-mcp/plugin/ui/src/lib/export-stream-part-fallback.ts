import { BLANK_PNG_BASE64, BLANK_PNG_CONTENT_HASH } from './blank-png';

const RASTER_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export type StreamAssetLine = {
  kind: 'asset';
  mimeType: string;
  bytesBase64: string;
  contentHash: string;
  figmaNodeId?: string;
  figmaImageHash?: string;
  exportScale?: number;
};

export function parseRasterImageAssetLine(line: string): StreamAssetLine | null {
  try {
    const part = JSON.parse(line.trim()) as StreamAssetLine;
    if (part.kind !== 'asset') return null;
    if (!RASTER_IMAGE_MIMES.has(part.mimeType)) return null;
    if (typeof part.bytesBase64 !== 'string') return null;
    return part;
  } catch {
    return null;
  }
}

/** Replace raster image bytes with a tiny blank PNG; preserves figma ids for assembly. */
export function substituteBlankRasterImageLine(line: string): string | null {
  const part = parseRasterImageAssetLine(line);
  if (!part) return null;
  return (
    JSON.stringify({
      ...part,
      mimeType: 'image/png',
      bytesBase64: BLANK_PNG_BASE64,
      contentHash: BLANK_PNG_CONTENT_HASH,
    }) + '\n'
  );
}

export function isImagePartUploadFallbackError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return false;
  const msg = error.message.toLowerCase();
  if (msg.includes('part_line_too_large') || msg.includes('payload_too_large')) {
    return true;
  }
  return (
    error instanceof TypeError ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed') ||
    msg.includes('empty response')
  );
}
