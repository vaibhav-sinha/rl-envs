import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { FileEnvelope } from '../model/types.js';

/** Build `data:` URLs for every asset in the registry so Playwright `setContent` can render images. */
export function buildImageDataUrlByHash(envelope: FileEnvelope, jsonAbsolutePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  const reg = envelope.assets?.byId;
  if (!reg) return out;
  const baseDir = dirname(jsonAbsolutePath);
  for (const rec of Object.values(reg)) {
    const abs = join(baseDir, rec.relativePath);
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
