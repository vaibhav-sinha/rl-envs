import { describe, expect, it } from 'vitest';
import {
  EXPORT_TREE_BATCH_SIZE,
  STREAM_PROTOCOL_VERSION,
  estimateUploadPartTotal,
  isTreeStreamLine,
  streamPartToLine,
} from '../plugin/src/streamProtocol.js';

describe('streamProtocol batch helpers', () => {
  it('detects tree stream lines', () => {
    expect(isTreeStreamLine(streamPartToLine({ kind: 'tree_enter', node: { id: '1', type: 'FRAME', name: 'F', properties: {} } }))).toBe(true);
    expect(isTreeStreamLine(streamPartToLine({ kind: 'tree_exit' }))).toBe(true);
    expect(isTreeStreamLine(streamPartToLine({ kind: 'session_end', exportId: 'x' }))).toBe(false);
  });

  it('uses stream protocol v3', () => {
    expect(STREAM_PROTOCOL_VERSION).toBe(3);
  });

  it('serializes session_totals and node_props lines', () => {
    expect(JSON.parse(streamPartToLine({ kind: 'session_totals', nodes: 1, iconExports: 2, rasterImages: 3 }).trim()).kind).toBe(
      'session_totals'
    );
    expect(
      JSON.parse(
        streamPartToLine({
          kind: 'node_props',
          nodeId: '1:1',
          properties: { hfcIconSvgAsset: '1:1' },
        }).trim()
      ).kind
    ).toBe('node_props');
  });

  it('estimates fewer upload parts when tree lines are batched', () => {
    const totals = { nodes: 1000, iconExports: 0, rasterImages: 0 };
    const unbatched = totals.nodes * 2 + 5;
    const batched = estimateUploadPartTotal(totals);
    expect(batched).toBe(Math.ceil((totals.nodes * 2) / EXPORT_TREE_BATCH_SIZE) + 5);
    expect(batched).toBeLessThan(unbatched);
  });
});
