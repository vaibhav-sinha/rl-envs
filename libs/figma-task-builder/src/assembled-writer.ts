import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeJsonFile } from './write-json-stream.js';
import type { AssembledAsset, AssembledSnapshot } from './snapshot-assembler.js';
import { assembledToFigmaPluginSnapshot } from './snapshot-assembler.js';

export const ASSEMBLED_DIR = 'assembled';
export const ASSEMBLED_META_FILE = 'meta.json';
export const ASSEMBLED_DOCUMENT_FILE = 'document.json';
export const ASSEMBLED_ASSET_MANIFEST_FILE = 'asset-manifest.json';

export interface AssembledAssetManifestEntry {
  contentHash: string;
  mimeType: AssembledAsset['mimeType'];
  figmaNodeId?: string;
  figmaImageHash?: string;
  exportScale?: number;
}

export interface AssembledMetaFile {
  snapshotVersion: number;
  exportedAt: string;
  figmaFileKey: string | null;
  figmaFileName: string;
  variableCollections: Record<string, unknown>[];
  paintStyles: Record<string, unknown>[];
  textStyles: Record<string, unknown>[];
  effectStyles: Record<string, unknown>[];
  gridStyles: Record<string, unknown>[];
}

export function writeAssembledToDisk(sessionDir: string, assembled: AssembledSnapshot): string {
  const assembledDir = join(sessionDir, ASSEMBLED_DIR);
  mkdirSync(assembledDir, { recursive: true });

  const snapshot = assembledToFigmaPluginSnapshot({ ...assembled, assets: [] });
  const meta: AssembledMetaFile = {
    snapshotVersion: snapshot.snapshotVersion,
    exportedAt: snapshot.exportedAt,
    figmaFileKey: snapshot.figmaFileKey,
    figmaFileName: snapshot.figmaFileName,
    variableCollections: snapshot.variableCollections,
    paintStyles: snapshot.paintStyles,
    textStyles: snapshot.textStyles,
    effectStyles: snapshot.effectStyles,
    gridStyles: snapshot.gridStyles,
  };

  const manifest: AssembledAssetManifestEntry[] = assembled.assets.map((a) => ({
    contentHash: a.contentHash,
    mimeType: a.mimeType,
    figmaNodeId: a.figmaNodeId,
    figmaImageHash: a.figmaImageHash,
    exportScale: a.exportScale,
  }));

  writeFileSync(join(assembledDir, ASSEMBLED_META_FILE), JSON.stringify(meta) + '\n', 'utf8');
  writeJsonFile(join(assembledDir, ASSEMBLED_DOCUMENT_FILE), snapshot.document);
  writeFileSync(
    join(assembledDir, ASSEMBLED_ASSET_MANIFEST_FILE),
    JSON.stringify(manifest) + '\n',
    'utf8'
  );

  return assembledDir;
}
