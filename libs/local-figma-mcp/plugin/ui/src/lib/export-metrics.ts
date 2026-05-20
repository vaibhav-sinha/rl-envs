/** Mirrors plugin/src/exportMetrics.ts ExportRunMetrics (UI display). */
export interface ExportRunMetrics {
  elapsedMs: number;
  phase: 'meta' | 'serialize' | 'icons' | 'images' | 'upload';
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

export class UiUploadMetrics {
  httpUploadMs = 0;
  partsUploaded = 0;
  lastPartMs = 0;

  recordUpload(durationMs: number): void {
    this.httpUploadMs += durationMs;
    this.partsUploaded += 1;
    this.lastPartMs = durationMs;
  }

  mergeWith(main: ExportRunMetrics): ExportRunMetrics {
    return {
      ...main,
      httpUploadMs: this.httpUploadMs,
      partsUploaded: this.partsUploaded,
      lastPartMs: this.lastPartMs,
    };
  }
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min}m ${rem}s` : `${min}m`;
}

export function formatCount(n: number): string {
  return n.toLocaleString();
}
