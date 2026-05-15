import { describe, expect, it } from 'vitest';
import {
  applyCreateNodeOp,
  applyEngineOp,
  findEnvelopeNode,
} from '../../src/engine/DocumentEngine.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

function createEmptyPhase9Envelope(): FileEnvelope {
  return {
    schemaVersion: 1,
    fileKey: 'phase9',
    fileName: 'phase9',
    nextInternalId: 100,
    document: {
      id: 'I1',
      type: 'DOCUMENT',
      name: 'Doc',
      children: [
        {
          id: 'I2',
          type: 'PAGE',
          name: 'Page 1',
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          children: [],
        },
      ],
    },
  };
}

function styledText(characters: string) {
  const len = characters.length; // UTF-16 code units for ASCII-only strings in tests.
  return {
    type: 'TEXT' as const,
    name: 'T',
    x: 0,
    y: 0,
    width: 200,
    height: 32,
    characters,
    fontSize: 16,
    fontWeight: 400,
    styledSegments: [{ start: 0, end: len, style: { fontSize: 16 } }],
    visible: true,
  };
}

describe('Phase 9 component graph (engine + compiler)', () => {
  it('selects variants via componentProperties + deletes instance on component delete', () => {
    const env = createEmptyPhase9Envelope();
    const pageId = env.document.children[0]!.id;

    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootA,
      node: styledText('VariantA'),
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'COMPONENT', name: 'CompA', x: 0, y: 0, width: 120, height: 40, rootFrameId: rootA },
    });

    const rootB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'FRAME', name: 'RootB', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: rootB,
      node: styledText('VariantB'),
    });
    const compB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pageId,
      node: { type: 'COMPONENT', name: 'CompB', x: 0, y: 0, width: 120, height: 40, rootFrameId: rootB },
    });

    const setId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pageId,
      node: {
        type: 'COMPONENT_SET',
        name: 'Set',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        componentIds: [compA, compB],
        variantPropertyKey: 'variant',
        variantOptions: ['VariantA', 'VariantB'],
        baseComponentId: compA,
      },
    });

    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pageId,
      node: {
        type: 'INSTANCE',
        name: 'Inst',
        x: 10,
        y: 20,
        width: 120,
        height: 40,
        mainComponentId: setId,
        componentProperties: { variant: { type: 'VARIANT', value: 'VariantA' } },
        visible: true,
      },
    });

    const compiledA = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: instId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(compiledA.html).toContain('VariantA');
    expect(compiledA.html).not.toContain('VariantB');

    applyEngineOp(env, {
      op: 'updateNode',
      nodeId: instId,
      patch: { componentProperties: { variant: { type: 'VARIANT', value: 'VariantB' } } },
    });

    const compiledB = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: instId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(compiledB.html).toContain('VariantB');
    expect(compiledB.html).not.toContain('VariantA');

    // Deleting a component wrapper should delete instances referencing it (via a set containing it).
    expect(findEnvelopeNode(env, instId)?.type).toBe('INSTANCE');
    applyEngineOp(env, { op: 'deleteNode', nodeId: compA });
    expect(findEnvelopeNode(env, instId)).toBe(null);

    // Deleting a component wrapper also deletes its master root FRAME.
    expect(findEnvelopeNode(env, rootA)).toBe(null);
  });
});

