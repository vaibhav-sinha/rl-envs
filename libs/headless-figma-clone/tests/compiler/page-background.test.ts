import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('page canvas background', () => {
  it('applies PageNode.backgrounds to #hfc-root when compiling a page', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const page = env.document.children[0]!;
    if (page.type === 'PAGE') {
      page.backgrounds = [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.9 } }];
    }
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'FRAME',
        name: 'Card',
        x: 10,
        y: 10,
        width: 100,
        height: 80,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      },
    });

    const compiled = designCompiler.compileFirstPage({
      envelope: env,
      pageId: pid,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(compiled.html).toContain('#hfc-root');
    expect(compiled.html).toMatch(/background-color:rgba\(26,\s*51,\s*230/);
  });
});
