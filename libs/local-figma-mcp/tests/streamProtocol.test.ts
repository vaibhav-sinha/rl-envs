import { describe, expect, it } from 'vitest';
import {
  EXPORT_ICON_PROPS_BATCH_SIZE,
  EXPORT_TREE_BATCH_MAX_CHARS,
  EXPORT_TREE_BATCH_SIZE,
  STREAM_PROTOCOL_VERSION,
  estimateUploadPartTotal,
  iconPropsBatchCount,
  isIconPropsLine,
  isTreeStreamLine,
  shouldFlushIconPropsBatch,
  shouldFlushTreeBatch,
  streamPartToLine,
  treeBatchCharCount,
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

  it('flushes tree batch by line count or char budget', () => {
    const line = streamPartToLine({
      kind: 'tree_enter',
      node: { id: '1', type: 'FRAME', name: 'F', properties: {} },
    });
    const few = Array.from({ length: EXPORT_TREE_BATCH_SIZE - 1 }, () => line);
    expect(shouldFlushTreeBatch(few)).toBe(false);
    expect(shouldFlushTreeBatch([...few, line])).toBe(true);

    const big = 'x'.repeat(EXPORT_TREE_BATCH_MAX_CHARS);
    expect(treeBatchCharCount([big])).toBeGreaterThanOrEqual(EXPORT_TREE_BATCH_MAX_CHARS);
    expect(shouldFlushTreeBatch([big])).toBe(true);
  });

  it('estimates fewer upload parts when tree lines are batched', () => {
    const totals = { nodes: 1000, iconExports: 0, rasterImages: 0 };
    const unbatched = totals.nodes * 2 + 5;
    const batched = estimateUploadPartTotal(totals);
    expect(batched).toBe(Math.ceil((totals.nodes * 2) / EXPORT_TREE_BATCH_SIZE) + 5);
    expect(batched).toBeLessThan(unbatched);
  });

  it('detects icon props lines and flushes by batch size', () => {
    const line = streamPartToLine({
      kind: 'node_props',
      nodeId: '1:1',
      properties: { hfcIconSvgAsset: '1:0' },
    });
    expect(isIconPropsLine(line)).toBe(true);

    const few = Array.from({ length: EXPORT_ICON_PROPS_BATCH_SIZE - 1 }, () => line);
    expect(shouldFlushIconPropsBatch(few)).toBe(false);
    expect(shouldFlushIconPropsBatch([...few, line])).toBe(true);
  });

  it('estimates icon upload parts from batched props and unique assets', () => {
    const totals = { nodes: 100, iconExports: 500, rasterImages: 10 };
    const iconStats = {
      iconRoots: 500,
      uniqueIconAssets: 40,
      iconPropsBatches: iconPropsBatchCount(500),
      iconExportCalls: 45,
      iconMcSkips: 455,
    };
    const refined = estimateUploadPartTotal(totals, iconStats);
    const treeBatches = Math.max(
      1,
      Math.ceil((totals.nodes * 2) / EXPORT_TREE_BATCH_SIZE),
      Math.ceil((totals.nodes * 2 * 800) / EXPORT_TREE_BATCH_MAX_CHARS)
    );
    expect(refined).toBe(treeBatches + iconStats.iconPropsBatches + iconStats.uniqueIconAssets + 10 + 5);
    expect(refined).toBeLessThan(estimateUploadPartTotal(totals));
  });
});
