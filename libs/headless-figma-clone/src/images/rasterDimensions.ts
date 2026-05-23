import { detectRasterMime } from './rasterMime.js';

export interface RasterSize {
  width: number;
  height: number;
}

const FIGMA_MAX_IMAGE_DIMENSION = 4096;

/** Returns pixel dimensions for PNG, JPEG, or GIF bytes. */
export function decodeRasterDimensions(buf: Buffer): RasterSize {
  const mime = detectRasterMime(buf);
  if (mime === 'image/png') return decodePngDimensions(buf);
  if (mime === 'image/jpeg') return decodeJpegDimensions(buf);
  if (mime === 'image/gif') return decodeGifDimensions(buf);
  throw new Error('Unsupported or corrupt image: cannot read dimensions');
}

/** Reject images wider or taller than Figma's 4096px limit. */
export function assertRasterWithinFigmaLimits(size: RasterSize): void {
  if (
    size.width > FIGMA_MAX_IMAGE_DIMENSION ||
    size.height > FIGMA_MAX_IMAGE_DIMENSION ||
    size.width < 1 ||
    size.height < 1
  ) {
    throw new Error(
      `Image dimensions ${String(size.width)}×${String(size.height)} are invalid (max ${String(FIGMA_MAX_IMAGE_DIMENSION)}px per side)`
    );
  }
}

function decodePngDimensions(buf: Buffer): RasterSize {
  if (buf.length < 24) throw new Error('PNG too short');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

function decodeGifDimensions(buf: Buffer): RasterSize {
  if (buf.length < 10) throw new Error('GIF too short');
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  return { width, height };
}

function decodeJpegDimensions(buf: Buffer): RasterSize {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error('JPEG too short or invalid signature');
  }
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1]!;
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15
    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;
    if (isSof) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    const segmentLen = buf.readUInt16BE(i + 2);
    if (segmentLen < 2) throw new Error('JPEG corrupt segment length');
    i += 2 + segmentLen;
  }
  throw new Error('JPEG missing SOF dimension segment');
}
