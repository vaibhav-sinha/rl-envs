import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ulid } from 'ulid';
import type { PersistenceService } from '../persistence/JsonPersistence.js';
import { persistAssetBytesOnDisk } from '../engine/DocumentEngine.js';
import { parseFigmaPluginSnapshot, type FigmaPluginSnapshot } from './snapshotSchema.js';
import { importFigmaPluginSnapshot, slugHfcFileName } from './figmaPluginSnapshot.js';

export interface ExportHfcRequest {
  hfcFileName: string;
  snapshot: unknown;
}

export interface ExportHfcResponse {
  filePath: string;
  fileKey: string;
  fileName: string;
}

export async function handleExportHfc(
  body: ExportHfcRequest,
  params: { workspaceDir: string; persistence: PersistenceService }
): Promise<ExportHfcResponse> {
  if (!body?.hfcFileName || typeof body.hfcFileName !== 'string') {
    throw new ExportError('BAD_REQUEST', 'Missing hfcFileName');
  }
  if (body.snapshot === undefined || body.snapshot === null) {
    throw new ExportError('BAD_REQUEST', 'Missing snapshot');
  }

  const snapshot: FigmaPluginSnapshot = parseFigmaPluginSnapshot(body.snapshot);
  const fileName = body.hfcFileName.trim() || snapshot.figmaFileName || 'Untitled';
  const slug = slugHfcFileName(fileName);
  const workspaceDir = resolve(params.workspaceDir);
  mkdirSync(workspaceDir, { recursive: true });
  const filePath = join(workspaceDir, `${slug}.hfc.json`);

  const { envelope, assetBuffers } = importFigmaPluginSnapshot(snapshot, { fileName });

  for (const { buf, mime } of assetBuffers) {
    await persistAssetBytesOnDisk(filePath, envelope, buf, mime);
  }

  await params.persistence.save({ path: filePath, envelope });

  return {
    filePath,
    fileKey: envelope.fileKey,
    fileName: envelope.fileName,
  };
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
