import { describe, expect, it } from 'vitest';
import { duplicateNodeInEnvelope } from '../../src/engine/DocumentEngine.js';
import { buildGraphIndexes } from '../../src/engine/nodeIndex.js';
import { applyIndexForEngineOp } from '../../src/engine/nodeIndexMutations.js';
import {
  nearestInstanceAncestorForTest,
  shouldMaterializeDuplicatedClone,
} from '../../src/engine/instanceMaterialize.js';
import { emptyEnvelope } from '../helpers/envelope.js';
import type { FrameNode, InstanceNode, RectangleNode } from '../../src/model/types.js';

describe('instanceMaterialize', () => {
  it('skips whole-frame duplicates', () => {
    const frame = { type: 'FRAME', name: 'Screen', id: 'I1' } as FrameNode;
    expect(shouldMaterializeDuplicatedClone(frame)).toBe(false);
  });

  it('materializes leaf rectangles under an instance ancestor', () => {
    const env = emptyEnvelope(100);
    const page = env.document.children[0]!;
    const inst: InstanceNode = {
      id: 'I10',
      type: 'INSTANCE',
      name: 'BrandFavicon',
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      mainComponentId: 'I_missing',
      children: [
        {
          id: 'I11',
          type: 'RECTANGLE',
          name: 'Rectangle 2851',
          sourceFigmaId: '9:9',
          x: 0,
          y: 0,
          width: 32,
          height: 32,
          fills: [{ type: 'IMAGE', imageHash: 'abc', visible: true, opacity: 1, blendMode: 'NORMAL', scaleMode: 'FILL' }],
        } as RectangleNode,
      ],
    };
    page.children.push(inst);

    const graph = buildGraphIndexes(env);
    expect(nearestInstanceAncestorForTest('I11', graph)?.id).toBe('I10');

    const cloneId = duplicateNodeInEnvelope(env, 'I11', { indexes: graph });
    applyIndexForEngineOp(graph, env, { op: 'duplicateNode', nodeId: 'I11' }, cloneId);
    const clone = graph.nodes.get(cloneId) as RectangleNode;
    expect(clone.type).toBe('RECTANGLE');
    expect(clone.fills?.some((f) => f.type === 'IMAGE')).toBe(true);
  });
});
