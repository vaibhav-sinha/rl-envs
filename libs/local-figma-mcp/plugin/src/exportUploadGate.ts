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
}

export class ExportUploadGate {
  private readonly exportId: string;
  private readonly postMessage: (msg: ExportUploadGateMessage) => void;
  private readonly metrics: ExportMetricsCollector;
  private readonly onAbortError: () => string | null;

  private nextSeq = 0;
  private inflight = 0;
  private treeBatch: string[] = [];
  private iconPropsBatch: string[] = [];
  private inflightWaiters: Array<() => void> = [];
  private drainWaiters: Array<() => void> = [];
  private pendingAckIsBatch = false;

  constructor(options: ExportUploadGateOptions) {
    this.exportId = options.exportId;
    this.postMessage = options.postMessage;
    this.metrics = options.metrics;
    this.onAbortError = options.onAbortError;
  }

  get uploadInflight(): number {
    return this.inflight;
  }

  get nextSequence(): number {
    return this.nextSeq;
  }

  handleAck(_seq: number): void {
    this.inflight = Math.max(0, this.inflight - 1);
    if (this.pendingAckIsBatch) this.metrics.onStreamBatchAcked();
    else this.metrics.onUploadAcked();
    this.pendingAckIsBatch = false;
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
    if (err) throw new Error(err);
    while (this.inflight >= max) {
      const waitStart = Date.now();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          const i = this.inflightWaiters.indexOf(resolve);
          if (i >= 0) this.inflightWaiters.splice(i, 1);
          reject(
            new Error(
              `Upload ack timed out with ${this.inflight} in flight (UI may have failed posting to Task Builder)`
            )
          );
        }, STREAM_ACK_TIMEOUT_MS);
        this.inflightWaiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      this.metrics.addUploadWaitMs(Date.now() - waitStart);
      const errAfter = this.onAbortError();
      if (errAfter) throw new Error(errAfter);
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
    await this.postStreamBatch(lines);
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
    await this.postStreamBatch(lines);
  }

  private async postStreamBatch(lines: string[]): Promise<void> {
    await this.waitForInflightBelow(EXPORT_UPLOAD_MAX_INFLIGHT);
    const seq = ++this.nextSeq;
    this.inflight += 1;
    this.metrics.onStreamBatchPosted();
    this.pendingAckIsBatch = true;
    this.postMessage({
      type: 'export_stream_batch',
      exportId: this.exportId,
      seq,
      lines,
    });
  }

  async postIconPropsLine(line: string): Promise<void> {
    this.pushIconPropsLine(line);
    await this.flushIconPropsBatchIfNeeded();
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
    const maxInflight = isAssetStreamLine(line)
      ? EXPORT_ASSET_MAX_INFLIGHT
      : EXPORT_UPLOAD_MAX_INFLIGHT;
    await this.waitForInflightBelow(maxInflight);
    const seq = ++this.nextSeq;
    this.inflight += 1;
    this.metrics.onUploadPosted();
    this.pendingAckIsBatch = false;
    this.postMessage({
      type: 'export_stream_part',
      exportId: this.exportId,
      seq,
      line,
    });
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
