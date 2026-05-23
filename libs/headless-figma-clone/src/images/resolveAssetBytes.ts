import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { EngineOperation } from '../engine/DocumentEngine.js';
import { isAssetRegisterOperation } from '../engine/DocumentEngine.js';
import { sidecarDirForHfcJson } from '../persistence/assetPaths.js';
import type { AssetRecord, FileEnvelope } from '../model/types.js';

export function lookupAssetRecord(
  reg: NonNullable<FileEnvelope['assets']>['byId'],
  hash: string
): AssetRecord | undefined {
  return reg[hash] ?? Object.values(reg).find((r) => r.sha256 === hash || r.id === hash);
}

export function resolveAssetAbsolutePath(
  jsonAbsolutePath: string,
  rec: Pick<AssetRecord, 'relativePath' | 'sha256' | 'mimeType'>
): string | null {
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

function mimeToFileExt(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/svg+xml') return 'svg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'bin';
}

function bytesFromPendingOps(ops: EngineOperation[], hash: string): Buffer | null {
  for (let i = ops.length - 1; i >= 0; i -= 1) {
    const op = ops[i]!;
    if (!isAssetRegisterOperation(op)) continue;
    const buf = Buffer.from(op.dataBase64, 'base64');
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha === hash) return buf;
  }
  return null;
}

export interface ResolveAssetBytesParams {
  envelope: FileEnvelope;
  hash: string;
  activeFilePath: string | null;
  pendingOps?: EngineOperation[];
  sessionBytes?: Map<string, Buffer>;
}

/** Resolve raster bytes for an asset hash (session cache, pending ops, then disk). */
export function resolveAssetBytes(params: ResolveAssetBytesParams): Buffer | null {
  const { envelope, hash, activeFilePath, pendingOps, sessionBytes } = params;
  const cached = sessionBytes?.get(hash);
  if (cached) return cached;

  if (pendingOps?.length) {
    const pending = bytesFromPendingOps(pendingOps, hash);
    if (pending) return pending;
  }

  const reg = envelope.assets?.byId;
  if (!reg || !activeFilePath) return null;
  const rec = lookupAssetRecord(reg, hash);
  if (!rec) return null;

  const abs = resolveAssetAbsolutePath(activeFilePath, rec);
  if (!abs) return null;
  try {
    return readFileSync(abs);
  } catch {
    return null;
  }
}
