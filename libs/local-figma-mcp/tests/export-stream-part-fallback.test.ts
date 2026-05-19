import { describe, expect, it } from 'vitest';
import { BLANK_PNG_BASE64, BLANK_PNG_CONTENT_HASH } from '../plugin/ui/src/lib/blank-png';
import {
  isImagePartUploadFallbackError,
  parseRasterImageAssetLine,
  substituteBlankRasterImageLine,
} from '../plugin/ui/src/lib/export-stream-part-fallback';

describe('parseRasterImageAssetLine', () => {
  it('accepts raster image asset lines', () => {
    const line = JSON.stringify({
      kind: 'asset',
      mimeType: 'image/jpeg',
      bytesBase64: 'abc',
      contentHash: 'deadbeef',
      figmaImageHash: 'img-1',
    });
    expect(parseRasterImageAssetLine(line + '\n')?.figmaImageHash).toBe('img-1');
  });

  it('ignores svg and non-asset lines', () => {
    const svg = JSON.stringify({
      kind: 'asset',
      mimeType: 'image/svg+xml',
      bytesBase64: 'abc',
      contentHash: 'x',
    });
    expect(parseRasterImageAssetLine(svg)).toBeNull();
    expect(parseRasterImageAssetLine(JSON.stringify({ kind: 'tree_enter' }))).toBeNull();
  });
});

describe('substituteBlankRasterImageLine', () => {
  it('replaces bytes with blank png while keeping figma ids', () => {
    const line =
      JSON.stringify({
        kind: 'asset',
        mimeType: 'image/webp',
        bytesBase64: 'huge',
        contentHash: 'old',
        figmaImageHash: 'hash-42',
      }) + '\n';
    const out = substituteBlankRasterImageLine(line)!;
    const parsed = JSON.parse(out.trim());
    expect(parsed.mimeType).toBe('image/png');
    expect(parsed.bytesBase64).toBe(BLANK_PNG_BASE64);
    expect(parsed.contentHash).toBe(BLANK_PNG_CONTENT_HASH);
    expect(parsed.figmaImageHash).toBe('hash-42');
  });
});

describe('isImagePartUploadFallbackError', () => {
  it('matches network and oversize upload failures', () => {
    expect(isImagePartUploadFallbackError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isImagePartUploadFallbackError(new Error('PART_LINE_TOO_LARGE'))).toBe(true);
    expect(isImagePartUploadFallbackError(new Error('NOT_FOUND: export session'))).toBe(false);
  });
});
