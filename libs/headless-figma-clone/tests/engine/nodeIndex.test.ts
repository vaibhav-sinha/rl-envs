import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { buildNodeIndex } from '../../src/engine/nodeIndex.js';
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
});
