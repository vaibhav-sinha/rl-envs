import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { collectMetadataTree, collectPagesIndex } from '../../src/mcp/metadata.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('collectPagesIndex', () => {
  it('lists PAGE children of the document', () => {
    const env = emptyEnvelope();
    const pages = collectPagesIndex(env.document);
    expect(pages).toEqual([{ id: pageId(env), name: 'Page 1' }]);
  });
});

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
    const meta = collectMetadataTree(frame, { working: env });
    expect(meta.layoutMode).toBe('HORIZONTAL');
    expect(meta.layoutWrap).toBe('WRAP');
    expect(meta.itemSpacing).toBe(8);
    expect(meta.layoutGridTracks).toBe(12);

    const table = env.document.children[0]!.children.find((c) => c.type === 'TABLE')!;
    const tableMeta = collectMetadataTree(table, { working: env });
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
    const shallow = collectMetadataTree(outer, { maxDepth: 0, working: env });
    expect(shallow.children).toBeUndefined();
    const deep = collectMetadataTree(outer, { maxDepth: 2, working: env });
    expect(deep.children?.[0]?.name).toBe('Inner');
  });

  it('descends into SECTION and GROUP children', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const sectionId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'SECTION', name: 'S', x: 0, y: 0, width: 200, height: 200, children: [] },
    });
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: sectionId,
      node: { type: 'FRAME', name: 'Inner', x: 0, y: 0, width: 80, height: 40, children: [] },
    });
    const groupId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'GROUP', name: 'G', x: 0, y: 220, width: 100, height: 60, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: groupId,
      node: { type: 'RECTANGLE', name: 'Dot', x: 0, y: 0, width: 8, height: 8 },
    });
    const section = env.document.children[0]!.children.find((c) => c.id === sectionId)!;
    const group = env.document.children[0]!.children.find((c) => c.id === groupId)!;
    const sectionMeta = collectMetadataTree(section, { maxDepth: 2, working: env });
    expect(sectionMeta.children?.[0]?.id).toBe(frameId);
    expect(sectionMeta.children?.[0]?.name).toBe('Inner');
    const groupMeta = collectMetadataTree(group, { maxDepth: 2, working: env });
    expect(groupMeta.children?.[0]?.name).toBe('Dot');
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
    const meta = collectMetadataTree(node, { working: env });
    expect(meta.mainComponentId).toBe(comp);
  });

  it('descends into COMPONENT rootFrame and COMPONENT_SET variants', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootA,
      node: { type: 'TEXT', name: 'Label', x: 0, y: 0, width: 80, height: 20, characters: 'Hi' },
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'COMPONENT', name: 'A', x: 0, y: 0, width: 120, height: 40, rootFrameId: rootA },
    });
    const rootB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'RootB', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootB,
      node: { type: 'TEXT', name: 'LabelB', x: 0, y: 0, width: 80, height: 20, characters: 'Bye' },
    });
    const compB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'COMPONENT', name: 'B', x: 0, y: 0, width: 120, height: 40, rootFrameId: rootB },
    });
    const setId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT_SET',
        name: 'Set',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        componentIds: [compA, compB],
        variantPropertyKey: 'State',
        variantOptions: ['A', 'B'],
      },
    });
    const compNode = env.document.children[0]!.children.find((c) => c.id === compA)!;
    const compMeta = collectMetadataTree(compNode, { maxDepth: 2, working: env });
    expect(compMeta.children?.[0]?.type).toBe('FRAME');
    expect(compMeta.children?.[0]?.children?.[0]?.name).toBe('Label');

    const setNode = env.document.children[0]!.children.find((c) => c.id === setId)!;
    const setMeta = collectMetadataTree(setNode, { maxDepth: 3, working: env });
    expect(setMeta.children?.map((c) => c.name).sort()).toEqual(['A', 'B']);
    const innerA = setMeta.children?.find((c) => c.name === 'A');
    expect(innerA?.children?.[0]?.children?.[0]?.name).toBe('Label');
  });

  it('returns page-absolute bounds for nested frame under section', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const sectionId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'SECTION', name: 'S', x: 100, y: 200, width: 800, height: 600, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: sectionId,
      node: { type: 'FRAME', name: 'Inner', x: 50, y: 60, width: 400, height: 300, children: [] },
    });
    const section = env.document.children[0]!.children.find((c) => c.id === sectionId)!;
    const meta = collectMetadataTree(section, { maxDepth: 2, working: env });
    expect(meta.bounds).toEqual({ x: 100, y: 200, width: 800, height: 600 });
    expect(meta.children?.[0]?.bounds).toEqual({ x: 150, y: 260, width: 400, height: 300 });
  });
});
