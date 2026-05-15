import { describe, expect, it } from 'vitest';
import {
  applyCreateNodeOp,
  applyEngineOp,
  findEnvelopeNode,
} from '../../src/engine/DocumentEngine.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

function styledText(characters: string) {
  const len = characters.length;
  return {
    type: 'TEXT' as const,
    name: 'T',
    x: 0,
    y: 0,
    width: 120,
    height: 24,
    characters,
    fontSize: 16,
    fontWeight: 400,
    styledSegments: [{ start: 0, end: len, style: { fontSize: 16 } }],
    visible: true,
  };
}

describe('INSTANCE variant compile snapshot contract', () => {
  it('emits variant text and stable wrapper class', () => {
    const env = emptyEnvelope(100);
    const pid = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootA,
      node: styledText('Alpha'),
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
      node: styledText('Beta'),
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
        variantPropertyKey: 'variant',
        variantOptions: ['Alpha', 'Beta'],
        baseComponentId: compA,
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'INSTANCE',
        name: 'Inst',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        mainComponentId: setId,
        componentProperties: { variant: { type: 'VARIANT', value: 'Beta' } },
        visible: true,
      },
    });
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: instId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('Beta');
    expect(out.html).not.toContain('Alpha');
    expect(out.html).toContain(`hfc-node-${instId}`);
  });

  it('recompiles after variant property patch', () => {
    const env = emptyEnvelope(100);
    const pid = pageId(env);
    const root = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'R', x: 0, y: 0, width: 80, height: 30, children: [] },
    });
    applyCreateNodeOp(env, { op: 'createNode', parentId: root, node: styledText('One') });
    const comp = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'COMPONENT', name: 'C', x: 0, y: 0, width: 80, height: 30, rootFrameId: root },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'INSTANCE',
        name: 'I',
        x: 0,
        y: 0,
        width: 80,
        height: 30,
        mainComponentId: comp,
        visible: true,
      },
    });
    applyEngineOp(env, {
      op: 'updateNode',
      nodeId: instId,
      patch: { x: 5 },
    });
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: instId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('One');
    const inst = findEnvelopeNode(env, instId);
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type === 'INSTANCE') expect(inst.x).toBe(5);
  });
});
