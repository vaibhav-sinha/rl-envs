import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('section render', () => {
  it('compileSubtree emits section children, not just background fill', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);

    const sectionId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'SECTION',
        name: 'Orders',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }],
        children: [],
      },
    });

    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: sectionId,
      node: {
        type: 'FRAME',
        name: 'Screen',
        x: 16,
        y: 16,
        width: 360,
        height: 260,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
        children: [],
      },
    });

    const textId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: frameId,
      node: {
        type: 'TEXT',
        name: 'Title',
        x: 12,
        y: 12,
        width: 200,
        height: 24,
        characters: 'Order details',
        fontSize: 18,
        fontName: { family: 'Inter', style: 'Regular' },
      },
    });

    const compiled = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: sectionId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    const bundle = compiled.html + compiled.css;
    expect(bundle).toContain(`hfc-node-${sectionId}`);
    expect(bundle).toContain(`hfc-node-${frameId}`);
    expect(bundle).toContain(`hfc-node-${textId}`);
    expect(bundle).toContain('Order details');
  });
});
