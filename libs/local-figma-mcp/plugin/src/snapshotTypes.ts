/** Duplicated from headless-figma-clone import schema — no package dependency. */
export const SNAPSHOT_VERSION = 1 as const;

export interface SerializedNode {
  id: string;
  type: string;
  name: string;
  children?: SerializedNode[];
  properties: Record<string, unknown>;
}

export type SerializedRasterAsset = {
  figmaImageHash: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  base64: string;
};

export type SerializedSvgAsset = {
  figmaNodeId: string;
  mimeType: 'image/svg+xml';
  base64: string;
};

export type SerializedAsset = SerializedRasterAsset | SerializedSvgAsset;

export interface FigmaPluginSnapshot {
  snapshotVersion: typeof SNAPSHOT_VERSION;
  exportedAt: string;
  figmaFileKey: string | null;
  figmaFileName: string;
  document: SerializedNode;
  variableCollections: Record<string, unknown>[];
  paintStyles: Record<string, unknown>[];
  textStyles: Record<string, unknown>[];
  effectStyles: Record<string, unknown>[];
  gridStyles: Record<string, unknown>[];
  assets: SerializedAsset[];
}
