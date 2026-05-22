import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, findEnvelopeNode, findParentNode } from '../../src/engine/DocumentEngine.js';
import {
  buildGraphIndexes,
  buildNodeIndex,
  findComponentSetForComponent,
  resolveParentNode,
} from '../../src/engine/nodeIndex.js';
import { findAllDescendants } from '../../src/traversal/findNodes.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('buildNodeIndex', () => {
  it('resolves nodes in O(1) and matches tree walk', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 10, height: 10, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: frameId,
      node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 4, height: 4 },
    });
    const index = buildNodeIndex(env);
    const page = env.document.children[0]!;
    expect(findEnvelopeNode(env, frameId, index)?.name).toBe('F');
    expect(findEnvelopeNode(env, 'missing', index)).toBeNull();
    const hits = findAllDescendants(page, env, { name: 'R', nameMatch: 'exact' }, undefined, { nodeIndex: index });
    expect(hits).toHaveLength(1);
  });

  it('buildGraphIndexes records parent chain and component set map', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 10, height: 10, children: [] },
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'COMPONENT', name: 'A', x: 0, y: 0, width: 10, height: 10, rootFrameId: rootA },
    });
    const rootB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'RootB', x: 0, y: 0, width: 10, height: 10, children: [] },
    });
    const compB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT',
        name: 'B',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        rootFrameId: rootB,
      },
    });
    const setId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT_SET',
        name: 'Set',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        componentIds: [compA, compB],
        variantPropertyKey: 'State',
        variantOptions: ['Default', 'Hover'],
      },
    });
    const graph = buildGraphIndexes(env);
    const rectId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootA,
      node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 4, height: 4 },
    });
    const graph2 = buildGraphIndexes(env);
    expect(resolveParentNode(graph2, rectId)?.id).toBe(rootA);
    expect(findParentNode(env.document, rectId)?.id).toBe(rootA);
    expect(findComponentSetForComponent(graph, compA)?.id).toBe(setId);
    expect(graph.parentById.get(compA)).toBe(pid);
  });
});
