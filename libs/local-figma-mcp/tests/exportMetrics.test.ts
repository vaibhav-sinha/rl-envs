import { describe, expect, it, vi } from 'vitest';
import { ExportMetricsCollector, shouldEmitProgressMetrics } from '../plugin/src/exportMetrics.js';
import { EXPORT_PROGRESS_EVERY_NODES } from '../plugin/src/streamProtocol.js';

describe('ExportMetricsCollector', () => {
  it('accumulates serializeMs only during active slices', () => {
    vi.useFakeTimers();
    const m = new ExportMetricsCollector();
    m.setPhase('serialize');
    m.beginSerializeSlice();
    vi.advanceTimersByTime(50);
    m.endSerializeSlice();
    vi.advanceTimersByTime(100);
    m.beginSerializeSlice();
    vi.advanceTimersByTime(30);
    m.endSerializeSlice();
    const snap = m.snapshot('serialize');
    expect(snap.serializeMs).toBe(80);
    vi.useRealTimers();
  });

  it('tracks upload wait and batch counters', () => {
    const m = new ExportMetricsCollector();
    m.onStreamBatchPosted();
    m.onStreamBatchAcked();
    m.addUploadWaitMs(42);
    const snap = m.snapshot('upload');
    expect(snap.treeBatchesPosted).toBe(1);
    expect(snap.treeBatchesAcked).toBe(1);
    expect(snap.uploadWaitMs).toBe(42);
    expect(snap.uploadInflight).toBe(0);
  });
});

describe('shouldEmitProgressMetrics', () => {
  it('fires every EXPORT_PROGRESS_EVERY_NODES', () => {
    expect(shouldEmitProgressMetrics(0, EXPORT_PROGRESS_EVERY_NODES)).toBe(false);
    expect(shouldEmitProgressMetrics(1000, EXPORT_PROGRESS_EVERY_NODES)).toBe(true);
    expect(shouldEmitProgressMetrics(2000, EXPORT_PROGRESS_EVERY_NODES)).toBe(true);
  });
});
