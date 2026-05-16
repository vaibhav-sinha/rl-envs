import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { queueGroupNodes } from '../../src/engine/graphOps.js';
import type { FileEnvelope } from '../../src/engine/DocumentEngine.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

function emptyEnv(): FileEnvelope {
  return {
    schemaVersion: 1,
    fileKey: 't',
    fileName: 't',
    nextInternalId: 10,
    document: {
      id: 'I1',
      type: 'DOCUMENT',
      name: 'Document',
      children: [
        {
          id: 'I2',
          type: 'PAGE',
          name: 'Page 1',
          children: [],
        },
      ],
    },
  };
}

/** GROUP inside horizontal auto-layout must render as one flex child; overlapping children stay stacked. */
describe('group inside auto-layout flex', () => {
  it('emits a group wrapper and positions children locally inside it', () => {
    const working = emptyEnv();
    const ops: Parameters<typeof queueGroupNodes>[1] = [];
    const pageId = 'I2';
    const rowId = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: pageId,
      node: {
        type: 'FRAME',
        name: 'Row',
        x: 0,
        y: 0,
        width: 200,
        height: 80,
        layoutMode: 'HORIZONTAL',
        itemSpacing: 12,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 8,
        paddingBottom: 8,
      },
    });
    const aId = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: rowId,
      node: { type: 'RECTANGLE', name: 'A', x: 20, y: 10, width: 60, height: 40 },
    });
    const bId = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: rowId,
      node: { type: 'RECTANGLE', name: 'B', x: 40, y: 20, width: 60, height: 40 },
    });
    const groupId = queueGroupNodes(working, ops, [aId, bId], { id: rowId });
    const row = working.document.children[0]!.children[0]!;
    const group = row.children.find((c) => c.id === groupId);
    expect(group?.type).toBe('GROUP');
    const out = designCompiler.compileSubtree({
      envelope: working,
      rootNodeId: row.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.css ?? ''}\n${out.html}`;

    expect(blob).toContain(`.hfc-node-${groupId}{`);
    expect(blob).toContain(`data-hfc-id="${groupId}"`);
    expect(blob).toContain(`.hfc-node-${aId}{position:absolute;left:0px;top:0px;`);
    expect(blob).toContain(`.hfc-node-${bId}{position:absolute;left:20px;top:10px;`);
    expect(blob).not.toMatch(new RegExp(`\\.hfc-node-${aId}\\{[^}]*flex:`));
    expect(blob).not.toMatch(new RegExp(`\\.hfc-node-${bId}\\{[^}]*flex:`));
  });
});
