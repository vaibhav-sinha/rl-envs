import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { sidecarDirForHfcJson } from '../persistence/assetPaths.js';
import type { FileEnvelope } from '../model/types.js';

function mimeToFileExt(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/svg+xml') return 'svg';
  if (mimeType === 'image/webp') return 'webp';
  return 'bin';
}

function resolveAssetAbsolutePath(jsonAbsolutePath: string, rec: {
  relativePath: string;
  sha256: string;
  mimeType: string;
}): string | null {
  const baseDir = dirname(jsonAbsolutePath);
  const sidecar = sidecarDirForHfcJson(jsonAbsolutePath);
  const ext = mimeToFileExt(rec.mimeType);
  const candidates = [
    join(baseDir, rec.relativePath),
    join(sidecar, `${rec.sha256}.${ext}`),
    join(sidecar, basename(rec.relativePath)),
  ];
  for (const abs of candidates) {
    if (existsSync(abs)) return abs;
  }
  return null;
}

/** Build `data:` URLs for every asset in the registry so Playwright `setContent` can render images. */
export function buildImageDataUrlByHash(envelope: FileEnvelope, jsonAbsolutePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  const reg = envelope.assets?.byId;
  if (!reg) return out;
  for (const rec of Object.values(reg)) {
    const abs = resolveAssetAbsolutePath(jsonAbsolutePath, rec);
    if (!abs) continue;
    try {
      const buf = readFileSync(abs);
      const b64 = buf.toString('base64');
      const dataUrl = `data:${rec.mimeType};base64,${b64}`;
      out[rec.sha256] = dataUrl;
      out[rec.id] = dataUrl;
    } catch {
      /* missing file — compiler may warn */
    }
  }
  return out;
}
