/** Mirrors plugin export progress timing (UI display). */
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

/** @deprecated Legacy metrics shape from v1 progress messages. */
export interface ExportRunMetrics {
  elapsedMs: number;
  phase: 'meta' | 'serialize' | 'icons' | 'images' | 'upload';
  serializeMs: number;
  uploadWaitMs: number;
  metaMs: number;
  iconsMs: number;
  imagesMs: number;
  imagesFetchMs?: number;
  imagesUploadMs?: number;
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

  mergeIntoTiming(timing: ExportProgressTiming): ExportProgressTiming {
    return {
      ...timing,
      httpUploadMs: this.httpUploadMs,
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
