import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { queueFlattenNodes, queueGroupNodes, queueUngroup } from '../../src/engine/graphOps.js';
import type { EngineOperation } from '../../src/engine/DocumentEngine.js';

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

describe('phase7 group flatten boolean graph ops', () => {
  it('group then ungroup preserves child ids', () => {
    const working = emptyEnv();
    const ops: EngineOperation[] = [];
    const pageId = 'I2';
    const r1 = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'RECTANGLE', name: 'A', x: 0, y: 0, width: 40, height: 40 },
    });
    const r2 = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'RECTANGLE', name: 'B', x: 50, y: 0, width: 40, height: 40 },
    });
    const groupId = queueGroupNodes(working, ops, [r1, r2], { id: pageId });
    expect(working.document.children[0]!.children.some((c) => c.id === groupId)).toBe(true);
    const moved = queueUngroup(working, ops, groupId);
    expect(moved).toEqual([r1, r2]);
    expect(working.document.children[0]!.children.some((c) => c.id === r1)).toBe(true);
    expect(working.document.children[0]!.children.some((c) => c.id === r2)).toBe(true);
  });

  it('flatten produces VECTOR and removes operands', () => {
    const working = emptyEnv();
    const ops: EngineOperation[] = [];
    const pageId = 'I2';
    const r1 = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'RECTANGLE', name: 'A', x: 0, y: 0, width: 40, height: 40 },
    });
    const r2 = applyCreateNodeOp(working, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'RECTANGLE', name: 'B', x: 50, y: 0, width: 40, height: 40 },
    });
    const vecId = queueFlattenNodes(working, ops, [r1, r2], { id: pageId });
    const vec = working.document.children[0]!.children.find((c) => c.id === vecId);
    expect(vec?.type).toBe('VECTOR');
    expect(working.document.children[0]!.children.some((c) => c.id === r1)).toBe(false);
    expect(working.document.children[0]!.children.some((c) => c.id === r2)).toBe(false);
  });
});
