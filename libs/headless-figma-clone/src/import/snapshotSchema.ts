import { z } from 'zod';

export const SNAPSHOT_VERSION = 1 as const;

export const serializedNodeSchema: z.ZodType<SerializedNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    children: z.array(serializedNodeSchema).optional(),
    properties: z.record(z.string(), z.unknown()).default({}),
  })
);

const rasterAssetSchema = z.object({
  figmaImageHash: z.string(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  base64: z.string(),
});

const svgAssetSchema = z.object({
  figmaNodeId: z.string(),
  mimeType: z.literal('image/svg+xml'),
  base64: z.string(),
});

const iconPngAssetSchema = z.object({
  figmaNodeId: z.string(),
  mimeType: z.literal('image/png'),
  base64: z.string(),
  exportScale: z.number().int().min(1).max(4).optional(),
});

export const serializedAssetSchema = z.union([rasterAssetSchema, svgAssetSchema, iconPngAssetSchema]);

export const figmaPluginSnapshotSchema = z.object({
  snapshotVersion: z.literal(SNAPSHOT_VERSION),
  exportedAt: z.string(),
  figmaFileKey: z.string().nullable(),
  figmaFileName: z.string(),
  document: serializedNodeSchema,
  variableCollections: z.array(z.record(z.string(), z.unknown())),
  paintStyles: z.array(z.record(z.string(), z.unknown())),
  textStyles: z.array(z.record(z.string(), z.unknown())),
  effectStyles: z.array(z.record(z.string(), z.unknown())),
  gridStyles: z.array(z.record(z.string(), z.unknown())),
  assets: z.array(serializedAssetSchema),
});

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

export type SerializedIconPngAsset = {
  figmaNodeId: string;
  mimeType: 'image/png';
  base64: string;
  exportScale?: number;
};

export type SerializedAsset = SerializedRasterAsset | SerializedSvgAsset | SerializedIconPngAsset;

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

export function parseFigmaPluginSnapshot(input: unknown): FigmaPluginSnapshot {
  return figmaPluginSnapshotSchema.parse(input);
}
