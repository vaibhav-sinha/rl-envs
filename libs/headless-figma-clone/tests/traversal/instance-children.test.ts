import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { getDescendantWalkRoots, getImmediateSceneChildren } from '../../src/traversal/findNodes.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('instance children (script / traversal)', () => {
  it('INSTANCE children are direct children of the main component root frame, not instance-owned nodes', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const rootFrameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'Root', x: 0, y: 0, width: 40, height: 20 },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootFrameId,
      node: { type: 'RECTANGLE', name: 'MasterInner', x: 0, y: 0, width: 10, height: 10 },
    });
    const compId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT',
        name: 'Button',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        rootFrameId,
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'INSTANCE',
        name: 'Button inst',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        mainComponentId: compId,
        children: [
          {
            type: 'RECTANGLE',
            name: 'InstanceOwned',
            id: 'I101',
            x: 0,
            y: 0,
            width: 5,
            height: 5,
          },
        ],
      },
    });

    const inst = findEnvelopeNode(env, instId)!;
    expect(inst.type).toBe('INSTANCE');
    const direct = getImmediateSceneChildren(inst, env);
    expect(direct.map((n) => n.name)).toEqual(['MasterInner']);
    expect(direct.map((n) => n.name)).not.toContain('InstanceOwned');

    const walkRoots = getDescendantWalkRoots(inst, env);
    expect(walkRoots.map((n) => n.name)).toEqual(['MasterInner']);
  });

  it('INSTANCE children do not include nested descendants under the component root', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const rootFrameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'Root', x: 0, y: 0, width: 40, height: 20 },
    });
    const nestedId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootFrameId,
      node: { type: 'FRAME', name: 'Nested', x: 0, y: 0, width: 20, height: 20 },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: nestedId,
      node: { type: 'RECTANGLE', name: 'Deep', x: 0, y: 0, width: 5, height: 5 },
    });
    const compId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT',
        name: 'Button',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        rootFrameId,
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'INSTANCE',
        name: 'Button inst',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        mainComponentId: compId,
      },
    });

    const inst = findEnvelopeNode(env, instId)!;
    expect(getImmediateSceneChildren(inst, env).map((n) => n.name)).toEqual(['Nested']);
  });

  it('INSTANCE with empty component root returns empty children', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const rootFrameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'Root', x: 0, y: 0, width: 40, height: 20 },
    });
    const compId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT',
        name: 'Button',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        rootFrameId,
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'INSTANCE',
        name: 'Button inst',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        mainComponentId: compId,
      },
    });

    const inst = findEnvelopeNode(env, instId)!;
    expect(getImmediateSceneChildren(inst, env)).toEqual([]);
    expect(getDescendantWalkRoots(inst, env)).toEqual([]);
  });
});
