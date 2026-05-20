/** Layout written by figma-task-builder under an export session dir (keep in sync). */

export const ASSEMBLED_DIR = 'assembled';
export const ASSEMBLED_META_FILE = 'meta.json';
export const ASSEMBLED_DOCUMENT_FILE = 'document.json';
export const ASSEMBLED_ASSET_MANIFEST_FILE = 'asset-manifest.json';

export interface AssembledAssetManifestEntry {
  contentHash: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml';
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
