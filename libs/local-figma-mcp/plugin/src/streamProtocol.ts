/** NDJSON streaming export protocol v3 — keep in sync with figma-task-builder/src/stream-protocol.ts */

export const STREAM_PROTOCOL_VERSION = 3 as const;

/** Max bytes per NDJSON line in a stream part (enforced by Task Builder). */
export const EXPORT_STREAM_PART_MAX_BYTES = 20 * 1024 * 1024;

/** Tree enter/exit lines batched per upload request (main → UI → Task Builder). */
export const EXPORT_TREE_BATCH_SIZE = 256;

/** Icon `node_props` lines batched per upload request (main → UI → Task Builder). */
export const EXPORT_ICON_PROPS_BATCH_SIZE = 128;

/**
 * Max UTF-16 code units per tree batch postMessage body (main → UI).
 * Figma iframe postMessage and Task Builder readTextBody must stay under limits.
 */
export const EXPORT_TREE_BATCH_MAX_CHARS = 3 * 1024 * 1024;

/** Max tree batches posted to UI before main blocks on ack (backpressure). */
export const EXPORT_UPLOAD_MAX_INFLIGHT = 6;

/** Max non-tree parts in flight (assets are large). */
export const EXPORT_ASSET_MAX_INFLIGHT = 5;

/** Parallel `exportAsync` calls for icon roots. */
export const ICON_EXPORT_CONCURRENCY = 3;

/** Parallel `getBytesAsync` calls for raster image fills. */
export const RASTER_IMAGE_CONCURRENCY = 12;

/** Max concurrent HTTP uploads for asset parts in the plugin UI. */
export const EXPORT_UI_ASSET_UPLOAD_CONCURRENCY = 4;

/** Yield to the event loop every N nodes during tree serialization. */
export const TREE_SERIALIZE_YIELD_EVERY = 1000;

/** Throttle export_progress + metrics during long serialize/icons/images phases. */
export const EXPORT_PROGRESS_EVERY_NODES = 1000;

export type ExportProgressPhase = 'meta' | 'serialize' | 'icons' | 'images' | 'upload';

export interface ExportTotals {
  nodes: number;
  iconExports: number;
  rasterImages: number;
}

/** Upload progress inputs after the icon phase completes. */
export interface IconUploadStats {
  iconRoots: number;
  uniqueIconAssets: number;
  iconPropsBatches: number;
  iconExportCalls: number;
  iconMcSkips: number;
}

export interface ExportProgress {
  phase: ExportProgressPhase;
  current: number;
  total: number;
  percent: number;
  detail?: string;
}

export interface SerializedNodeWire {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

export type StreamPart =
  | {
      kind: 'session_start';
      streamProtocol: typeof STREAM_PROTOCOL_VERSION;
      exportId: string;
      hfcFileName: string;
      snapshotVersion: number;
      figmaFileKey: string | null;
      figmaFileName: string;
      totals: ExportTotals;
    }
  | {
      kind: 'session_totals';
      nodes: number;
      iconExports: number;
      rasterImages: number;
      iconUniqueAssets?: number;
      iconExportCalls?: number;
    }
  | {
      kind: 'meta';
      exportedAt: string;
      variableCollections: Record<string, unknown>[];
      paintStyles: Record<string, unknown>[];
      textStyles: Record<string, unknown>[];
      effectStyles: Record<string, unknown>[];
      gridStyles: Record<string, unknown>[];
    }
  | { kind: 'tree_enter'; node: SerializedNodeWire }
  | { kind: 'tree_exit' }
  | {
      kind: 'node_props';
      nodeId: string;
      properties: Record<string, unknown>;
    }
  | {
      kind: 'asset';
      contentHash: string;
      mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml';
      bytesBase64: string;
      figmaNodeId?: string;
      figmaImageHash?: string;
      exportScale?: number;
    }
  | { kind: 'session_end'; exportId: string };

export function exportPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((100 * current) / total));
}

export function streamPartToLine(part: StreamPart): string {
  return JSON.stringify(part) + '\n';
}

export function isTreeStreamLine(line: string): boolean {
  return line.includes('"tree_enter"') || line.includes('"tree_exit"');
}

export function isIconPropsLine(line: string): boolean {
  return line.includes('"node_props"');
}

export function isAssetStreamLine(line: string): boolean {
  return line.includes('"asset"');
}

/** Estimated upload requests after tree batching (for progress UI). */
export function treeBatchCharCount(lines: readonly string[]): number {
  let n = 0;
  for (const line of lines) n += line.length;
  return n;
}

export function shouldFlushTreeBatch(lines: readonly string[]): boolean {
  if (lines.length === 0) return false;
  if (lines.length >= EXPORT_TREE_BATCH_SIZE) return true;
  return treeBatchCharCount(lines) >= EXPORT_TREE_BATCH_MAX_CHARS;
}

export function shouldFlushIconPropsBatch(lines: readonly string[]): boolean {
  if (lines.length === 0) return false;
  if (lines.length >= EXPORT_ICON_PROPS_BATCH_SIZE) return true;
  return treeBatchCharCount(lines) >= EXPORT_TREE_BATCH_MAX_CHARS;
}

export function iconPropsBatchCount(iconRoots: number): number {
  if (iconRoots <= 0) return 0;
  return Math.ceil(iconRoots / EXPORT_ICON_PROPS_BATCH_SIZE);
}

export function estimateUploadPartTotal(
  totals: ExportTotals,
  iconStats?: IconUploadStats
): number {
  const treeLines = Math.max(0, totals.nodes * 2);
  const treeBatches = Math.max(
    1,
    Math.ceil(treeLines / EXPORT_TREE_BATCH_SIZE),
    Math.ceil((treeLines * 800) / EXPORT_TREE_BATCH_MAX_CHARS)
  );
  const iconParts = iconStats
    ? iconStats.iconPropsBatches + iconStats.uniqueIconAssets
    : iconPropsBatchCount(totals.iconExports) + totals.iconExports;
  return treeBatches + iconParts + totals.rasterImages + 5;
}
