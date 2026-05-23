import type { EngineOperation } from '../engine/DocumentEngine.js';
import type { FileEnvelope } from '../model/types.js';
import { assertRasterWithinFigmaLimits, decodeRasterDimensions } from './rasterDimensions.js';
import { detectRasterMime, type RasterMime } from './rasterMime.js';
import { resolveAssetBytes } from './resolveAssetBytes.js';

export interface ImageHandle {
  readonly hash: string;
  getBytesAsync(): Promise<Uint8Array>;
  getSizeAsync(): Promise<{ width: number; height: number }>;
}

export interface ImageHandleContext {
  working: FileEnvelope;
  ops: EngineOperation[];
  sessionAssetBytes: Map<string, Buffer>;
  activeFilePath: string | null;
}

export function createImageHandle(ctx: ImageHandleContext, hash: string): ImageHandle {
  const resolve = (): Buffer => {
    const buf = resolveAssetBytes({
      envelope: ctx.working,
      hash,
      activeFilePath: ctx.activeFilePath,
      pendingOps: ctx.ops,
      sessionBytes: ctx.sessionAssetBytes,
    });
    if (!buf || buf.length === 0) {
      throw new Error(`Image bytes unavailable for hash ${hash}`);
    }
    return buf;
  };

  return {
    hash,
    getBytesAsync: async () => new Uint8Array(resolve()),
    getSizeAsync: async () => {
      const size = decodeRasterDimensions(resolve());
      assertRasterWithinFigmaLimits(size);
      return size;
    },
  };
}

/** Validate raster bytes, cache in session, return a Figma-compatible Image handle. */
export function registerRasterImageInScript(
  ctx: ImageHandleContext,
  buf: Buffer,
  register: (buf: Buffer, mime: RasterMime) => string
): ImageHandle {
  const mime = detectRasterMime(buf);
  if (!mime) {
    throw new Error('createImage: data must be encoded as PNG, JPEG, or GIF');
  }
  const size = decodeRasterDimensions(buf);
  assertRasterWithinFigmaLimits(size);
  const hash = register(buf, mime);
  ctx.sessionAssetBytes.set(hash, buf);
  return createImageHandle(ctx, hash);
}
