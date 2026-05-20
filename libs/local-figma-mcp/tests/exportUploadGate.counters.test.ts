import { describe, expect, it } from 'vitest';
import { ExportMetricsCollector } from '../plugin/src/exportMetrics.js';
import { ExportUploadGate } from '../plugin/src/exportUploadGate.js';

function makeGate() {
  const metrics = new ExportMetricsCollector();
  const gate = new ExportUploadGate({
    exportId: 'exp-1',
    metrics,
    postMessage: () => {},
    onAbortError: () => null,
  });
  return gate;
}

describe('ExportUploadGate counters', () => {
  it('tracks tree and icon_props batches separately', async () => {
    const gate = makeGate();
    gate.pushTreeLine('{"kind":"tree_enter"}\n');
    await gate.flushTreeBatch();
    gate.handleAck(1);

    await gate.postIconPropsLine('{"kind":"node_props","nodeId":"1"}\n');
    await gate.flushIconPropsBatch();
    gate.handleAck(2);

    expect(gate.counters.treeBatchesPosted).toBe(1);
    expect(gate.counters.treeBatchesAcked).toBe(1);
    expect(gate.counters.iconPropsBatchesPosted).toBe(1);
    expect(gate.counters.iconPropsBatchesAcked).toBe(1);
  });

  it('tracks raster assets separately from icon assets', async () => {
    const gate = makeGate();
    await gate.postRasterAsset(
      '{"kind":"asset","mimeType":"image/png","figmaImageHash":"abc"}\n'
    );
    gate.handleAck(1);

    await gate.postLine(
      '{"kind":"asset","mimeType":"image/svg+xml","figmaNodeId":"node-1"}\n'
    );
    gate.handleAck(2);

    expect(gate.counters.rasterAssetsPosted).toBe(1);
    expect(gate.counters.rasterAssetsAcked).toBe(1);
    expect(gate.counters.iconAssetsPosted).toBe(1);
    expect(gate.counters.iconAssetsAcked).toBe(1);
  });
});
