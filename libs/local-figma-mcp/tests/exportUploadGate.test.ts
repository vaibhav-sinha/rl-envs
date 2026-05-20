import { describe, expect, it } from 'vitest';
import { ExportMetricsCollector } from '../plugin/src/exportMetrics.js';
import { ExportUploadGate } from '../plugin/src/exportUploadGate.js';
import { EXPORT_UPLOAD_MAX_INFLIGHT } from '../plugin/src/streamProtocol.js';

function makeGate() {
  const posted: { type: string; seq: number }[] = [];
  const metrics = new ExportMetricsCollector();
  const gate = new ExportUploadGate({
    exportId: 'exp-1',
    metrics,
    postMessage: (msg) => {
      posted.push({ type: msg.type, seq: msg.seq });
    },
    onAbortError: () => null,
  });
  return { gate, posted, metrics };
}

describe('ExportUploadGate', () => {
  it('pipelines tree batches up to max inflight', async () => {
    const { gate, posted } = makeGate();
    const line = '{"kind":"tree_enter"}\n';

    const flushPromises: Promise<void>[] = [];
    for (let i = 0; i < EXPORT_UPLOAD_MAX_INFLIGHT; i++) {
      gate.pushTreeLine(line);
      flushPromises.push(gate.flushTreeBatch());
    }
    await Promise.all(flushPromises);

    expect(posted).toHaveLength(EXPORT_UPLOAD_MAX_INFLIGHT);

    let blocked = false;
    gate.pushTreeLine(line);
    const blockedFlush = gate.flushTreeBatch().then(() => {
      blocked = true;
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(blocked).toBe(false);

    gate.handleAck(1);
    await blockedFlush;
    expect(blocked).toBe(true);
    expect(posted).toHaveLength(EXPORT_UPLOAD_MAX_INFLIGHT + 1);
  });

  it('drain waits until all inflight acked', async () => {
    const { gate } = makeGate();
    gate.pushTreeLine('{"kind":"tree_exit"}\n');
    const flushP = gate.flushTreeBatch();
    const drainP = gate.drain();
    let drained = false;
    void drainP.then(() => {
      drained = true;
    });
    await flushP;
    await new Promise((r) => setTimeout(r, 10));
    expect(drained).toBe(false);
    gate.handleAck(1);
    await drainP;
    expect(drained).toBe(true);
  });
});
