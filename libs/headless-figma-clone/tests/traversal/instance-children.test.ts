import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import {
  findAllDescendants,
  getDescendantWalkRoots,
  getImmediateSceneChildren,
} from '../../src/traversal/findNodes.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('instance children (script / traversal)', () => {
  it('INSTANCE children are the instance stored subtree, not main component root frame nodes', () => {
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
    expect(direct.map((n) => n.name)).toEqual(['InstanceOwned']);
    expect(direct.map((n) => n.name)).not.toContain('MasterInner');

    const walkRoots = getDescendantWalkRoots(inst, env);
    expect(walkRoots.map((n) => n.name)).toEqual(['InstanceOwned']);
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

  it('INSTANCE with unresolved mainComponent falls back to stored children', () => {
    const env = emptyEnvelope();
    const page = env.document.children[0]!;
    const frame = {
      id: 'I100',
      type: 'FRAME' as const,
      name: 'Screen',
      x: 0,
      y: 0,
      width: 360,
      height: 800,
      children: [] as import('../../src/model/types.js').SceneNode[],
    };
    const inst = {
      id: 'I101',
      type: 'INSTANCE' as const,
      name: 'OnboardingHeader',
      x: 0,
      y: 20,
      width: 328,
      height: 68,
      mainComponentId: 'I0',
      children: [
        {
          type: 'TEXT' as const,
          name: 'Title',
          id: 'I901',
          x: 0,
          y: 0,
          width: 328,
          height: 24,
          characters: 'Enter the OTP',
        },
        {
          type: 'TEXT' as const,
          name: 'Subtitle',
          id: 'I902',
          x: 0,
          y: 28,
          width: 328,
          height: 40,
          characters: 'We texted you a code.',
        },
      ],
    };
    frame.children.push(inst);
    page.children.push(frame);

    const instNode = findEnvelopeNode(env, inst.id)!;
    expect(instNode.type).toBe('INSTANCE');
    const direct = getImmediateSceneChildren(instNode, env);
    expect(direct.map((n) => n.name)).toEqual(['Title', 'Subtitle']);
    expect(direct.map((n) => (n.type === 'TEXT' ? n.characters : undefined))).toEqual([
      'Enter the OTP',
      'We texted you a code.',
    ]);

    const texts = findAllDescendants(instNode, env, { types: ['TEXT'] });
    expect(texts.map((n) => (n.type === 'TEXT' ? n.characters : undefined))).toEqual([
      'Enter the OTP',
      'We texted you a code.',
    ]);
  });

  it('resolved mainComponent still returns stored instance children', () => {
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
      node: { type: 'TEXT', name: 'MasterTitle', x: 0, y: 0, width: 40, height: 12, characters: 'From master' },
    });
    const compId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT',
        name: 'Header',
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
        name: 'Header inst',
        x: 0,
        y: 0,
        width: 40,
        height: 20,
        mainComponentId: compId,
        children: [
          {
            type: 'TEXT',
            name: 'StoredOverride',
            id: 'I903',
            x: 0,
            y: 0,
            width: 40,
            height: 12,
            characters: 'From stored subtree',
          },
        ],
      },
    });

    const inst = findEnvelopeNode(env, instId)!;
    const direct = getImmediateSceneChildren(inst, env);
    expect(direct.map((n) => n.name)).toEqual(['StoredOverride']);
    expect(direct.map((n) => (n.type === 'TEXT' ? n.characters : undefined))).toEqual(['From stored subtree']);
  });
});
