import { describe, expect, it } from 'vitest';
import { ExportMetricsCollector } from '../plugin/src/exportMetrics.js';
import { ExportUploadGate } from '../plugin/src/exportUploadGate.js';
import {
  EXPORT_ICON_PROPS_BATCH_SIZE,
  streamPartToLine,
} from '../plugin/src/streamProtocol.js';

function makeGate() {
  const posted: Array<{ type: string; lines?: string[]; line?: string }> = [];
  const metrics = new ExportMetricsCollector();
  const gate = new ExportUploadGate({
    exportId: 'exp-1',
    metrics,
    postMessage: (msg) => {
      if (msg.type === 'export_stream_batch') {
        posted.push({ type: msg.type, lines: msg.lines });
      } else {
        posted.push({ type: msg.type, line: msg.line });
      }
    },
    onAbortError: () => null,
  });
  return { gate, posted, metrics };
}

const propsLine = streamPartToLine({
  kind: 'node_props',
  nodeId: '1:1',
  properties: { hfcIconSvgAsset: '1:0' },
});

const assetLine = streamPartToLine({
  kind: 'asset',
  contentHash: 'abc',
  mimeType: 'image/svg+xml',
  bytesBase64: 'PHN2Zz48L3N2Zz4=',
  figmaNodeId: '1:0',
});

describe('ExportUploadGate icon props batching', () => {
  it('batches node_props into export_stream_batch', async () => {
    const { gate, posted } = makeGate();

    for (let i = 0; i < EXPORT_ICON_PROPS_BATCH_SIZE; i++) {
      await gate.postIconPropsLine(propsLine);
    }

    expect(posted).toHaveLength(1);
    expect(posted[0]?.type).toBe('export_stream_batch');
    expect(posted[0]?.lines).toHaveLength(EXPORT_ICON_PROPS_BATCH_SIZE);
  });

  it('flushes icon props batch before posting an asset', async () => {
    const { gate, posted } = makeGate();

    await gate.postIconPropsLine(propsLine);
    await gate.postLine(assetLine);

    expect(posted).toHaveLength(2);
    expect(posted[0]?.type).toBe('export_stream_batch');
    expect(posted[0]?.lines).toHaveLength(1);
    expect(posted[1]?.type).toBe('export_stream_part');
    expect(posted[1]?.line).toContain('"asset"');
  });

  it('flushIconPropsBatch posts a partial batch', async () => {
    const { gate, posted } = makeGate();

    await gate.postIconPropsLine(propsLine);
    await gate.flushIconPropsBatch();

    expect(posted).toHaveLength(1);
    expect(posted[0]?.type).toBe('export_stream_batch');
    expect(posted[0]?.lines).toHaveLength(1);
  });
});
