import type { ExportMetricsCollector, ExportRunMetrics } from './exportMetrics.js';
import type { ExportUploadGate } from './exportUploadGate.js';
import type { ExportTotals } from './streamProtocol.js';

export type ExportActivePhase =
  | 'meta'
  | 'serialize'
  | 'icons'
  | 'images'
  | 'upload_tree'
  | 'upload_icons'
  | 'upload_images'
  | 'finalize'
  | 'idle';

export interface ExportProgressTracks {
  meta: { done: boolean };
  nodes: { serialized: number; total: number };
  icons: { exported: number; total: number; uniqueAssets: number };
  images: { fetched: number; uploaded: number; total: number };
  upload: {
    treeBatchesPosted: number;
    treeBatchesAcked: number;
    iconPropsBatchesPosted: number;
    iconPropsBatchesAcked: number;
    rasterAssetsPosted: number;
    rasterAssetsAcked: number;
    httpPartsUploaded: number;
  };
}

export interface ExportProgressTiming {
  elapsedMs: number;
  metaMs: number;
  serializeMs: number;
  iconsMs: number;
  imagesFetchMs: number;
  imagesUploadMs: number;
  uploadWaitMs: number;
  httpUploadMs?: number;
  nodesPerSec: number;
  nodesSerialized: number;
  uploadInflight: number;
}

export interface ExportProgressSnapshot {
  active: ExportActivePhase;
  activeDetail?: string;
  tracks: ExportProgressTracks;
  timing: ExportProgressTiming;
}

export interface ExportProgressReporterState {
  metaDone: boolean;
  nodesSerialized: number;
  nodesTotal: number;
  iconsExported: number;
  iconsTotal: number;
  iconUniqueAssets: number;
  imagesFetched: number;
  imagesUploaded: number;
  imagesTotal: number;
  iconsPhaseComplete: boolean;
  exportComplete: boolean;
}

export function createInitialReporterState(): ExportProgressReporterState {
  return {
    metaDone: false,
    nodesSerialized: 0,
    nodesTotal: 0,
    iconsExported: 0,
    iconsTotal: 0,
    iconUniqueAssets: 0,
    imagesFetched: 0,
    imagesUploaded: 0,
    imagesTotal: 0,
    iconsPhaseComplete: false,
    exportComplete: false,
  };
}

function formatCount(n: number): string {
  return n.toLocaleString();
}

export function deriveActivePhase(
  state: ExportProgressReporterState,
  gate: ExportUploadGate
): ExportActivePhase {
  if (!state.metaDone) return 'meta';
  if (state.nodesTotal === 0 || state.nodesSerialized < state.nodesTotal) return 'serialize';
  if (!state.iconsPhaseComplete && state.iconsTotal > 0 && state.iconsExported < state.iconsTotal) {
    return 'icons';
  }
  if (
    state.imagesTotal > 0 &&
    (state.imagesFetched < state.imagesTotal || state.imagesUploaded < state.imagesTotal)
  ) {
    return 'images';
  }

  const c = gate.counters;
  if (c.treeBatchesAcked < c.treeBatchesPosted) return 'upload_tree';
  if (c.iconPropsBatchesAcked < c.iconPropsBatchesPosted) return 'upload_icons';
  if (c.rasterAssetsAcked < c.rasterAssetsPosted) return 'upload_images';
  if (gate.uploadInflight > 0) return 'upload_images';
  if (!state.exportComplete) return 'upload_images';
  return 'idle';
}

export function buildActiveDetail(
  active: ExportActivePhase,
  state: ExportProgressReporterState,
  gate: ExportUploadGate
): string | undefined {
  const inflight = gate.uploadInflight;
  switch (active) {
    case 'meta':
      return state.metaDone ? undefined : 'Loading styles and variables…';
    case 'serialize':
      return state.nodesTotal > 0
        ? `Serializing nodes (${formatCount(state.nodesSerialized)} / ${formatCount(state.nodesTotal)})`
        : `Serializing nodes (${formatCount(state.nodesSerialized)})`;
    case 'icons':
      return `Exporting icons (${formatCount(state.iconsExported)} / ${formatCount(state.iconsTotal)})`;
    case 'images':
      return `Raster images (${formatCount(state.imagesUploaded)} / ${formatCount(state.imagesTotal)} uploaded · ${formatCount(state.imagesFetched)} fetched${inflight > 0 ? ` · ${inflight} in flight` : ''}`;
    case 'upload_tree': {
      const c = gate.counters;
      return `Tree batches (${formatCount(c.treeBatchesAcked)} / ${formatCount(c.treeBatchesPosted)} acked${inflight > 0 ? ` · ${inflight} in flight` : ''})`;
    }
    case 'upload_icons': {
      const c = gate.counters;
      return `Icon data (${formatCount(c.iconPropsBatchesAcked)} / ${formatCount(c.iconPropsBatchesPosted)} batches acked${inflight > 0 ? ` · ${inflight} in flight` : ''})`;
    }
    case 'upload_images': {
      const c = gate.counters;
      return `Image assets (${formatCount(c.rasterAssetsAcked)} / ${formatCount(c.rasterAssetsPosted)} acked${inflight > 0 ? ` · ${inflight} in flight` : ''})`;
    }
    default:
      return undefined;
  }
}

export function buildExportProgressSnapshot(
  state: ExportProgressReporterState,
  gate: ExportUploadGate,
  metrics: ExportMetricsCollector,
  httpPartsUploaded?: number
): ExportProgressSnapshot {
  const m = metrics.snapshotForProgress();
  const active = deriveActivePhase(state, gate);
  const c = gate.counters;

  return {
    active,
    activeDetail: buildActiveDetail(active, state, gate),
    tracks: {
      meta: { done: state.metaDone },
      nodes: { serialized: state.nodesSerialized, total: state.nodesTotal },
      icons: {
        exported: state.iconsExported,
        total: state.iconsTotal,
        uniqueAssets: state.iconUniqueAssets,
      },
      images: {
        fetched: state.imagesFetched,
        uploaded: state.imagesUploaded,
        total: state.imagesTotal,
      },
      upload: {
        treeBatchesPosted: c.treeBatchesPosted,
        treeBatchesAcked: c.treeBatchesAcked,
        iconPropsBatchesPosted: c.iconPropsBatchesPosted,
        iconPropsBatchesAcked: c.iconPropsBatchesAcked,
        rasterAssetsPosted: c.rasterAssetsPosted,
        rasterAssetsAcked: c.rasterAssetsAcked,
        httpPartsUploaded: httpPartsUploaded ?? 0,
      },
    },
    timing: {
      elapsedMs: m.elapsedMs,
      metaMs: m.metaMs,
      serializeMs: m.serializeMs,
      iconsMs: m.iconsMs,
      imagesFetchMs: m.imagesFetchMs,
      imagesUploadMs: m.imagesUploadMs,
      uploadWaitMs: m.uploadWaitMs,
      httpUploadMs: m.httpUploadMs,
      nodesPerSec: m.nodesPerSec,
      nodesSerialized: m.nodesSerialized,
      uploadInflight: m.uploadInflight,
    },
  };
}

export function applySessionTotals(
  state: ExportProgressReporterState,
  totals: ExportTotals
): void {
  state.nodesTotal = totals.nodes;
  state.iconsTotal = totals.iconExports;
  state.imagesTotal = totals.rasterImages;
}
