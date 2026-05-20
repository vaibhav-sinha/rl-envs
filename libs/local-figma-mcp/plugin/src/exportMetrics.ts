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
  imagesFetchMs: number;
  imagesUploadMs: number;
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
  private imagesFetchMs = 0;
  private imagesUploadMs = 0;
  private nodesSerialized = 0;
  private treeBatchesPosted = 0;
  private treeBatchesAcked = 0;
  private uploadInflight = 0;

  private phase: ExportProgressPhase | 'upload' = 'meta';
  private phaseStartMs = Date.now();
  private serializeSliceStart: number | null = null;
  private imagesFetchStart: number | null = null;
  private imagesUploadStart: number | null = null;

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

  beginImagesFetch(): void {
    if (this.imagesFetchStart === null) {
      this.imagesFetchStart = Date.now();
    }
  }

  endImagesFetch(): void {
    if (this.imagesFetchStart === null) return;
    this.imagesFetchMs += Date.now() - this.imagesFetchStart;
    this.imagesFetchStart = null;
  }

  beginImagesUpload(): void {
    if (this.imagesUploadStart === null) {
      this.imagesUploadStart = Date.now();
    }
  }

  endImagesUpload(): void {
    if (this.imagesUploadStart === null) return;
    this.imagesUploadMs += Date.now() - this.imagesUploadStart;
    this.imagesUploadStart = null;
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

  onUploadPosted(): void {
    this.uploadInflight += 1;
  }

  onUploadAcked(): void {
    this.uploadInflight = Math.max(0, this.uploadInflight - 1);
  }

  snapshot(phase: ExportProgressPhase | 'upload'): ExportRunMetrics {
    return { ...this.snapshotForProgress(), phase };
  }

  snapshotForProgress(): Omit<ExportRunMetrics, 'phase'> {
    const now = Date.now();
    let serializeMs = this.serializeMs;
    if (this.serializeSliceStart !== null) {
      serializeMs += now - this.serializeSliceStart;
    }
    let imagesFetchMs = this.imagesFetchMs;
    if (this.imagesFetchStart !== null) {
      imagesFetchMs += now - this.imagesFetchStart;
    }
    let imagesUploadMs = this.imagesUploadMs;
    if (this.imagesUploadStart !== null) {
      imagesUploadMs += now - this.imagesUploadStart;
    }
    const nodesPerSec =
      serializeMs > 0 ? Math.round((this.nodesSerialized * 1000) / serializeMs) : 0;
    return {
      elapsedMs: now - this.startMs,
      serializeMs,
      uploadWaitMs: this.uploadWaitMs,
      metaMs: this.metaMs,
      iconsMs: this.iconsMs,
      imagesMs: imagesFetchMs + imagesUploadMs,
      imagesFetchMs,
      imagesUploadMs,
      nodesSerialized: this.nodesSerialized,
      treeBatchesPosted: this.treeBatchesPosted,
      treeBatchesAcked: this.treeBatchesAcked,
      uploadInflight: this.uploadInflight,
      nodesPerSec,
    };
  }

  finalize(): ExportRunMetrics {
    this.endSerializeSlice();
    this.endImagesFetch();
    this.endImagesUpload();
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
