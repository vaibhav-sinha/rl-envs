import { logExportError } from './exportError.js';
import type { ExportMetricsCollector } from './exportMetrics.js';
import {
  EXPORT_ASSET_MAX_INFLIGHT,
  EXPORT_UPLOAD_MAX_INFLIGHT,
  isAssetStreamLine,
  isIconPropsLine,
  isTreeStreamLine,
  shouldFlushIconPropsBatch,
  shouldFlushTreeBatch,
} from './streamProtocol.js';

const STREAM_ACK_TIMEOUT_MS = 120_000;

export type StreamBatchKind = 'tree' | 'icon_props';

export interface GateUploadCounters {
  treeBatchesPosted: number;
  treeBatchesAcked: number;
  iconPropsBatchesPosted: number;
  iconPropsBatchesAcked: number;
  rasterAssetsPosted: number;
  rasterAssetsAcked: number;
  iconAssetsPosted: number;
  iconAssetsAcked: number;
}

export interface ExportUploadGatePost {
  type: 'export_stream_batch';
  exportId: string;
  seq: number;
  lines: string[];
}

export interface ExportUploadGateLinePost {
  type: 'export_stream_part';
  exportId: string;
  seq: number;
  line: string;
}

export type ExportUploadGateMessage = ExportUploadGatePost | ExportUploadGateLinePost;

export interface ExportUploadGateOptions {
  exportId: string;
  postMessage: (msg: ExportUploadGateMessage) => void;
  metrics: ExportMetricsCollector;
  onAbortError: () => string | null;
  onPosted?: () => void;
}

export class ExportUploadGate {
  private readonly exportId: string;
  private readonly postMessage: (msg: ExportUploadGateMessage) => void;
  private readonly metrics: ExportMetricsCollector;
  private readonly onAbortError: () => string | null;
  private readonly onPosted?: () => void;

  private nextSeq = 0;
  private inflight = 0;
  private treeBatch: string[] = [];
  private iconPropsBatch: string[] = [];
  private inflightWaiters: Array<() => void> = [];
  private drainWaiters: Array<() => void> = [];
  private pendingAckBatchKind: StreamBatchKind | null = null;
  private pendingAckIsRasterAsset = false;

  private _counters: GateUploadCounters = {
    treeBatchesPosted: 0,
    treeBatchesAcked: 0,
    iconPropsBatchesPosted: 0,
    iconPropsBatchesAcked: 0,
    rasterAssetsPosted: 0,
    rasterAssetsAcked: 0,
    iconAssetsPosted: 0,
    iconAssetsAcked: 0,
  };

  constructor(options: ExportUploadGateOptions) {
    this.exportId = options.exportId;
    this.postMessage = options.postMessage;
    this.metrics = options.metrics;
    this.onAbortError = options.onAbortError;
    this.onPosted = options.onPosted;
  }

  get uploadInflight(): number {
    return this.inflight;
  }

  get nextSequence(): number {
    return this.nextSeq;
  }

  get counters(): Readonly<GateUploadCounters> {
    return this._counters;
  }

  handleAck(_seq: number): void {
    this.inflight = Math.max(0, this.inflight - 1);
    if (this.pendingAckBatchKind === 'tree') {
      this._counters.treeBatchesAcked += 1;
      this.metrics.onStreamBatchAcked();
    } else if (this.pendingAckBatchKind === 'icon_props') {
      this._counters.iconPropsBatchesAcked += 1;
      this.metrics.onStreamBatchAcked();
    } else if (this.pendingAckIsRasterAsset) {
      this._counters.rasterAssetsAcked += 1;
      this.metrics.onUploadAcked();
    } else {
      this._counters.iconAssetsAcked += 1;
      this.metrics.onUploadAcked();
    }
    this.pendingAckBatchKind = null;
    this.pendingAckIsRasterAsset = false;
    this.wakeInflightWaiters();
    if (this.inflight === 0) {
      for (const w of this.drainWaiters) w();
      this.drainWaiters = [];
    }
  }

  private wakeInflightWaiters(): void {
    const waiters = this.inflightWaiters;
    this.inflightWaiters = [];
    for (const w of waiters) w();
  }

  private async waitForInflightBelow(max: number): Promise<void> {
    const err = this.onAbortError();
    if (err) {
      const abortErr = new Error(err);
      logExportError('uploadGate/uploadAbort', abortErr);
      throw abortErr;
    }
    while (this.inflight >= max) {
      const waitStart = Date.now();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          const i = this.inflightWaiters.indexOf(resolve);
          if (i >= 0) this.inflightWaiters.splice(i, 1);
          const ackErr = new Error(
            `Upload ack timed out with ${this.inflight} in flight (UI may have failed posting to Task Builder)`
          );
          logExportError('uploadGate/ackTimeout', ackErr);
          reject(ackErr);
        }, STREAM_ACK_TIMEOUT_MS);
        this.inflightWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      this.metrics.addUploadWaitMs(Date.now() - waitStart);
      const errAfter = this.onAbortError();
      if (errAfter) {
        const abortErr = new Error(errAfter);
        logExportError('uploadGate/uploadAbort', abortErr);
        throw abortErr;
      }
    }
  }

  pushTreeLine(line: string): void {
    this.treeBatch.push(line);
  }

  async flushTreeBatchIfNeeded(): Promise<void> {
    if (!shouldFlushTreeBatch(this.treeBatch)) return;
    await this.flushTreeBatch();
  }

  async flushTreeBatch(): Promise<void> {
    if (this.treeBatch.length === 0) return;
    const lines = this.treeBatch;
    this.treeBatch = [];
    await this.postStreamBatch(lines, 'tree');
  }

  pushIconPropsLine(line: string): void {
    this.iconPropsBatch.push(line);
  }

  async flushIconPropsBatchIfNeeded(): Promise<void> {
    if (!shouldFlushIconPropsBatch(this.iconPropsBatch)) return;
    await this.flushIconPropsBatch();
  }

  async flushIconPropsBatch(): Promise<void> {
    if (this.iconPropsBatch.length === 0) return;
    const lines = this.iconPropsBatch;
    this.iconPropsBatch = [];
    await this.postStreamBatch(lines, 'icon_props');
  }

  private async postStreamBatch(lines: string[], kind: StreamBatchKind): Promise<void> {
    await this.waitForInflightBelow(EXPORT_UPLOAD_MAX_INFLIGHT);
    const seq = ++this.nextSeq;
    this.inflight += 1;
    if (kind === 'tree') this._counters.treeBatchesPosted += 1;
    else this._counters.iconPropsBatchesPosted += 1;
    this.metrics.onStreamBatchPosted();
    this.pendingAckBatchKind = kind;
    this.pendingAckIsRasterAsset = false;
    this.postMessage({
      type: 'export_stream_batch',
      exportId: this.exportId,
      seq,
      lines,
    });
    this.onPosted?.();
  }

  async postIconPropsLine(line: string): Promise<void> {
    this.pushIconPropsLine(line);
    await this.flushIconPropsBatchIfNeeded();
  }

  /** Post a raster fill asset (figmaImageHash) — tracked separately for progress. */
  async postRasterAsset(line: string): Promise<void> {
    await this.postAssetLine(line, true);
  }

  async postLine(line: string): Promise<void> {
    if (isTreeStreamLine(line)) {
      this.pushTreeLine(line);
      await this.flushTreeBatchIfNeeded();
      return;
    }
    if (isIconPropsLine(line)) {
      await this.postIconPropsLine(line);
      return;
    }
    await this.flushTreeBatch();
    await this.flushIconPropsBatch();
    const isRaster = isAssetStreamLine(line) && line.includes('"figmaImageHash"');
    await this.postAssetLine(line, isRaster);
  }

  private async postAssetLine(line: string, isRaster: boolean): Promise<void> {
    await this.waitForInflightBelow(EXPORT_ASSET_MAX_INFLIGHT);
    const seq = ++this.nextSeq;
    this.inflight += 1;
    if (isRaster) this._counters.rasterAssetsPosted += 1;
    else if (isAssetStreamLine(line)) this._counters.iconAssetsPosted += 1;
    this.metrics.onUploadPosted();
    this.pendingAckBatchKind = null;
    this.pendingAckIsRasterAsset = isRaster;
    this.postMessage({
      type: 'export_stream_part',
      exportId: this.exportId,
      seq,
      line,
    });
    this.onPosted?.();
  }

  async drain(): Promise<void> {
    await this.flushTreeBatch();
    await this.flushIconPropsBatch();
    if (this.inflight === 0) return;
    await new Promise<void>((resolve) => {
      this.drainWaiters.push(resolve);
    });
  }
}
