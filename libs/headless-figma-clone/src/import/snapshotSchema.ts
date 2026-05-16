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

export const serializedAssetSchema = z.object({
  figmaImageHash: z.string(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/gif', 'image/webp']),
  base64: z.string(),
});

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

export interface SerializedAsset {
  figmaImageHash: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  base64: string;
}

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
