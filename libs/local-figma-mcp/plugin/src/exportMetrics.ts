import type { ExportProgressPhase } from './streamProtocol.js';

/** Timing snapshot for export progress UI (main-thread fields; UI merges http*). */
export interface ExportRunMetrics {
  elapsedMs: number;
  phase: ExportProgressPhase | 'upload';
  serializeMs: number;
  uploadWaitMs: number;
  metaMs: number;
  iconsMs: number;
  imagesMs: number;
  nodesSerialized: number;
  treeBatchesPosted: number;
  treeBatchesAcked: number;
  uploadInflight: number;
  nodesPerSec: number;
  httpUploadMs?: number;
  partsUploaded?: number;
  lastPartMs?: number;
}

export class ExportMetricsCollector {
  private readonly startMs = Date.now();
  private serializeMs = 0;
  private uploadWaitMs = 0;
  private metaMs = 0;
  private iconsMs = 0;
  private imagesMs = 0;
  private nodesSerialized = 0;
  private treeBatchesPosted = 0;
  private treeBatchesAcked = 0;
  private uploadInflight = 0;

  private phase: ExportProgressPhase | 'upload' = 'meta';
  private phaseStartMs = Date.now();
  private serializeSliceStart: number | null = null;

  setPhase(next: ExportProgressPhase | 'upload'): void {
    const now = Date.now();
    this.closePhaseTimer(now);
    this.phase = next;
    this.phaseStartMs = now;
  }

  private closePhaseTimer(now: number): void {
    const delta = now - this.phaseStartMs;
    switch (this.phase) {
      case 'meta':
        this.metaMs += delta;
        break;
      case 'serialize':
        this.serializeMs += delta;
        break;
      case 'icons':
        this.iconsMs += delta;
        break;
      case 'images':
        this.imagesMs += delta;
        break;
      default:
        break;
    }
  }

  beginSerializeSlice(): void {
    this.serializeSliceStart = Date.now();
  }

  endSerializeSlice(): void {
    if (this.serializeSliceStart === null) return;
    this.serializeMs += Date.now() - this.serializeSliceStart;
    this.serializeSliceStart = null;
  }

  addUploadWaitMs(ms: number): void {
    this.uploadWaitMs += ms;
  }

  setNodesSerialized(n: number): void {
    this.nodesSerialized = n;
  }

  incrementNodesSerialized(): void {
    this.nodesSerialized += 1;
  }

  onStreamBatchPosted(): void {
    this.treeBatchesPosted += 1;
    this.uploadInflight += 1;
  }

  onStreamBatchAcked(): void {
    this.treeBatchesAcked += 1;
    this.uploadInflight = Math.max(0, this.uploadInflight - 1);
  }

  /** @deprecated use onStreamBatchPosted */
  onTreeBatchPosted(): void {
    this.onStreamBatchPosted();
  }

  /** @deprecated use onStreamBatchAcked */
  onTreeBatchAcked(): void {
    this.onStreamBatchAcked();
  }

  onUploadPosted(): void {
    this.uploadInflight += 1;
  }

  onUploadAcked(): void {
    this.uploadInflight = Math.max(0, this.uploadInflight - 1);
  }

  snapshot(phase: ExportProgressPhase | 'upload'): ExportRunMetrics {
    const now = Date.now();
    let serializeMs = this.serializeMs;
    if (this.serializeSliceStart !== null) {
      serializeMs += now - this.serializeSliceStart;
    }
    const nodesPerSec =
      serializeMs > 0 ? Math.round((this.nodesSerialized * 1000) / serializeMs) : 0;
    return {
      elapsedMs: now - this.startMs,
      phase,
      serializeMs,
      uploadWaitMs: this.uploadWaitMs,
      metaMs: this.metaMs,
      iconsMs: this.iconsMs,
      imagesMs: this.imagesMs,
      nodesSerialized: this.nodesSerialized,
      treeBatchesPosted: this.treeBatchesPosted,
      treeBatchesAcked: this.treeBatchesAcked,
      uploadInflight: this.uploadInflight,
      nodesPerSec,
    };
  }

  finalize(): ExportRunMetrics {
    this.endSerializeSlice();
    this.closePhaseTimer(Date.now());
    return this.snapshot(this.phase);
  }
}

export function shouldEmitProgressMetrics(
  nodesSerialized: number,
  every: number
): boolean {
  return nodesSerialized > 0 && nodesSerialized % every === 0;
}
