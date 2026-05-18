import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ulid } from 'ulid';
import type { AssetRecord, FileEnvelope } from '../model/types.js';
import type { PersistenceService } from '../persistence/JsonPersistence.js';
import { persistAssetBytesOnDisk, registerAssetBytesInEnvelope } from '../engine/DocumentEngine.js';
import { parseFigmaPluginSnapshot, type FigmaPluginSnapshot } from './snapshotSchema.js';
import { importFigmaPluginSnapshot, slugHfcFileName } from './figmaPluginSnapshot.js';

export interface ExportHfcRequest {
  hfcFileName: string;
  snapshot: unknown;
}

export interface ImportHfcAsset {
  hash: string;
  mimeType: string;
  base64: string;
}

export interface ConvertedHfc {
  slug: string;
  fileKey: string;
  fileName: string;
  envelope: FileEnvelope;
  assets: ImportHfcAsset[];
  figmaToHfc: Record<string, string>;
}

export interface ImportHfcResponse {
  fileKey: string;
  fileName: string;
  slug: string;
  envelope: FileEnvelope;
  assets: ImportHfcAsset[];
  figmaToHfc: Record<string, string>;
}

export interface ExportHfcResponse {
  filePath: string;
  fileKey: string;
  fileName: string;
}

function bufToBase64(buf: Buffer): string {
  return buf.toString('base64');
}

export function convertFigmaSnapshot(body: ExportHfcRequest): ConvertedHfc {
  if (!body?.hfcFileName || typeof body.hfcFileName !== 'string') {
    throw new ExportError('BAD_REQUEST', 'Missing hfcFileName');
  }
  if (body.snapshot === undefined || body.snapshot === null) {
    throw new ExportError('BAD_REQUEST', 'Missing snapshot');
  }

  const snapshot: FigmaPluginSnapshot = parseFigmaPluginSnapshot(body.snapshot);
  const fileName = body.hfcFileName.trim() || snapshot.figmaFileName || 'Untitled';
  const slug = slugHfcFileName(fileName);
  const { envelope, assetBuffers, figmaToHfc } = importFigmaPluginSnapshot(snapshot, { fileName });

  const assets: ImportHfcAsset[] = [];
  for (const { buf, mime } of assetBuffers) {
    const { hash } = registerAssetBytesInEnvelope(envelope, buf, mime);
    assets.push({
      hash,
      mimeType: mime,
      base64: bufToBase64(buf),
    });
  }

  return {
    slug,
    fileKey: envelope.fileKey,
    fileName: envelope.fileName,
    envelope,
    assets,
    figmaToHfc,
  };
}

export function handleImportHfc(body: ExportHfcRequest): ImportHfcResponse {
  const converted = convertFigmaSnapshot(body);
  return {
    fileKey: converted.fileKey,
    fileName: converted.fileName,
    slug: converted.slug,
    envelope: converted.envelope,
    assets: converted.assets,
    figmaToHfc: converted.figmaToHfc,
  };
}

export async function saveConvertedHfc(
  converted: ConvertedHfc,
  params: { workspaceDir: string; persistence: PersistenceService }
): Promise<ExportHfcResponse> {
  const workspaceDir = resolve(params.workspaceDir);
  mkdirSync(workspaceDir, { recursive: true });
  const filePath = join(workspaceDir, `${converted.slug}.hfc.json`);

  for (const asset of converted.assets) {
    const buf = Buffer.from(asset.base64, 'base64');
    await persistAssetBytesOnDisk(filePath, converted.envelope, buf, asset.mimeType as AssetRecord['mimeType']);
  }

  await params.persistence.save({ path: filePath, envelope: converted.envelope });

  return {
    filePath,
    fileKey: converted.fileKey,
    fileName: converted.fileName,
  };
}

/** @deprecated Prefer POST /import/hfc + caller-side save. Persists when `save` is true. */
export async function handleExportHfc(
  body: ExportHfcRequest,
  params: { workspaceDir: string; persistence: PersistenceService; save?: boolean }
): Promise<ExportHfcResponse | ImportHfcResponse> {
  const converted = convertFigmaSnapshot(body);
  if (params.save === false) {
    return {
      fileKey: converted.fileKey,
      fileName: converted.fileName,
      slug: converted.slug,
      envelope: converted.envelope,
      assets: converted.assets,
      figmaToHfc: converted.figmaToHfc,
    };
  }
  return saveConvertedHfc(converted, params);
}

export class ExportError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

/** @internal test helper */
export function newFileKeyForExport(): string {
  return ulid();
}
