import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { collectMetadataTree } from '../../src/mcp/metadata.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('collectMetadataTree', () => {
  it('includes layout and table fields on nodes', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'FRAME',
        name: 'Nav',
        x: 0,
        y: 0,
        width: 200,
        height: 48,
        layoutMode: 'HORIZONTAL',
        layoutWrap: 'WRAP',
        itemSpacing: 8,
        layoutGrids: [{ type: 'COLUMNS', count: 12, gutter: 16 }],
        children: [],
      },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'TABLE',
        name: 'Grid',
        x: 0,
        y: 60,
        width: 120,
        height: 80,
        columnCount: 2,
        rowCount: 2,
        columnWidths: [60, 60],
        rowHeights: [40, 40],
        cells: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }],
      },
    });
    const frame = env.document.children[0]!.children.find((c) => c.id === frameId)!;
    const meta = collectMetadataTree(frame, {});
    expect(meta.layoutMode).toBe('HORIZONTAL');
    expect(meta.layoutWrap).toBe('WRAP');
    expect(meta.itemSpacing).toBe(8);
    expect(meta.layoutGridTracks).toBe(12);

    const table = env.document.children[0]!.children.find((c) => c.type === 'TABLE')!;
    const tableMeta = collectMetadataTree(table, {});
    expect(tableMeta.tableColumns).toBe(2);
    expect(tableMeta.tableRows).toBe(2);
  });

  it('respects maxDepth when walking children', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const outerId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'Outer', x: 0, y: 0, width: 100, height: 100, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: outerId,
      node: { type: 'RECTANGLE', name: 'Inner', x: 0, y: 0, width: 10, height: 10 },
    });
    const outer = env.document.children[0]!.children.find((c) => c.id === outerId)!;
    const shallow = collectMetadataTree(outer, { maxDepth: 0 });
    expect(shallow.children).toBeUndefined();
    const deep = collectMetadataTree(outer, { maxDepth: 2 });
    expect(deep.children?.[0]?.name).toBe('Inner');
  });

  it('includes mainComponentId on INSTANCE nodes', () => {
    const env = emptyEnvelope(50);
    const pid = pageId(env);
    const root = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'Root', x: 0, y: 0, width: 40, height: 20, children: [] },
    });
    const comp = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'COMPONENT', name: 'C', x: 0, y: 0, width: 40, height: 20, rootFrameId: root },
    });
    const inst = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'INSTANCE',
        name: 'I',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        mainComponentId: comp,
        visible: true,
      },
    });
    const node = env.document.children[0]!.children.find((c) => c.id === inst)!;
    const meta = collectMetadataTree(node, {});
    expect(meta.mainComponentId).toBe(comp);
  });
});
