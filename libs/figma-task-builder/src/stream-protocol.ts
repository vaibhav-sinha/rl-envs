/** NDJSON streaming export protocol v2 (plugin → Task Builder). */

export const STREAM_PROTOCOL_VERSION = 2 as const;

/** Max bytes per NDJSON line in a stream part request body (and per-line after split). */
export const EXPORT_STREAM_PART_MAX_BYTES = 20 * 1024 * 1024;

export type ExportProgressPhase = 'count' | 'serialize' | 'icons' | 'images' | 'upload';

export interface ExportTotals {
  nodes: number;
  iconExports: number;
  rasterImages: number;
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

export function parseStreamPartLine(line: string): StreamPart {
  const trimmed = line.trim();
  if (!trimmed) throw new Error('EMPTY_STREAM_LINE');
  return JSON.parse(trimmed) as StreamPart;
}
