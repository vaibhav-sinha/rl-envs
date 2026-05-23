import type { AssetRecord } from '../model/types.js';

/** Supported raster MIME types for `figma.createImage` (Figma: PNG, JPEG, GIF). */
export type RasterMime = Extract<
  AssetRecord['mimeType'],
  'image/png' | 'image/jpeg' | 'image/gif'
>;

/** Detect PNG/JPEG/GIF from magic bytes; returns null if unsupported. */
export function detectRasterMime(buf: Buffer): RasterMime | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return 'image/gif';
  }
  return null;
}
