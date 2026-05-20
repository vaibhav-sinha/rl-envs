import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import type { FigmaPluginSnapshot } from './snapshotSchema.js';
import {
  ASSEMBLED_ASSET_MANIFEST_FILE,
  ASSEMBLED_DOCUMENT_FILE,
  ASSEMBLED_DIR,
  ASSEMBLED_META_FILE,
  type AssembledAssetManifestEntry,
  type AssembledMetaFile,
} from './assembledSessionLayout.js';
import type { ExportHfcAssetFile } from './exportHandler.js';
import { ExportError } from './exportHandler.js';

export interface ImportHfcFromSessionRequest {
  hfcFileName: string;
  sessionDir: string;
  assetFiles?: ExportHfcAssetFile[];
}

export function resolveAllowedSessionDir(
  sessionDir: string,
  allowedRoots: readonly string[]
): string {
  const abs = resolve(sessionDir);
  for (const root of allowedRoots) {
    const rootAbs = resolve(root);
    const prefix = rootAbs.endsWith(sep) ? rootAbs : rootAbs + sep;
    if (abs === rootAbs || abs.startsWith(prefix)) {
      return abs;
    }
  }
  throw new ExportError('BAD_REQUEST', `sessionDir not under allowed import roots: ${abs}`);
}

export function loadSnapshotFromAssembledSession(sessionDir: string): FigmaPluginSnapshot {
  const assembledDir = join(sessionDir, ASSEMBLED_DIR);
  const metaPath = join(assembledDir, ASSEMBLED_META_FILE);
  const documentPath = join(assembledDir, ASSEMBLED_DOCUMENT_FILE);

  if (!existsSync(metaPath) || !existsSync(documentPath)) {
    throw new ExportError('BAD_REQUEST', 'Missing assembled/meta.json or assembled/document.json');
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as AssembledMetaFile;
  const document = JSON.parse(readFileSync(documentPath, 'utf8')) as FigmaPluginSnapshot['document'];

  return {
    snapshotVersion: meta.snapshotVersion as FigmaPluginSnapshot['snapshotVersion'],
    exportedAt: meta.exportedAt,
    figmaFileKey: meta.figmaFileKey,
    figmaFileName: meta.figmaFileName,
    document,
    variableCollections: meta.variableCollections,
    paintStyles: meta.paintStyles,
    textStyles: meta.textStyles,
    effectStyles: meta.effectStyles,
    gridStyles: meta.gridStyles,
    assets: [],
  };
}

export function assetFilesFromAssembledSession(
  sessionDir: string,
  requestAssetFiles?: ExportHfcAssetFile[]
): ExportHfcAssetFile[] {
  if (requestAssetFiles?.length) return requestAssetFiles;

  const manifestPath = join(sessionDir, ASSEMBLED_DIR, ASSEMBLED_ASSET_MANIFEST_FILE);
  if (!existsSync(manifestPath)) return [];

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as AssembledAssetManifestEntry[];
  return manifest.map((entry) => {
    const ext = mimeToExt(entry.mimeType);
    return {
      path: join(sessionDir, 'assets', `${entry.contentHash}.${ext}`),
      mimeType: entry.mimeType,
      figmaNodeId: entry.figmaNodeId,
      figmaImageHash: entry.figmaImageHash,
      exportScale: entry.exportScale,
    };
  });
}

function mimeToExt(mime: AssembledAssetManifestEntry['mimeType']): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}
