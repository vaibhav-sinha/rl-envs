import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';
import type { FileEnvelope } from '../../src/model/types.js';

const SALE_HFC = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

describe('ProductUI carousel (1655:196628)', () => {
  it('keeps 220px-wide product cards in the horizontal row and hugs description without hidden ATC', () => {
    const env = JSON.parse(readFileSync(SALE_HFC, 'utf8')) as FileEnvelope;
    const rootId = resolveHfcNodeIdBySourceFigmaId(env, '1655:196628');
    expect(rootId).toBeTruthy();

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: rootId!,
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: buildImageDataUrlForSubtree(env, SALE_HFC, rootId!),
      },
    });

    const productCss = out.html.match(/\.hfc-node-I9178\{([^}]+)\}/)?.[1] ?? '';
    expect(productCss).toContain('flex:0 0 220px');
    expect(productCss).not.toContain('flex:0 1 auto');

    expect(out.html).toMatch(/\.hfc-node-I9178 \.hfc-node-I74219\{[^}]*height:70px/);
    expect(out.html).not.toMatch(/\.hfc-node-I9178 \.hfc-node-I74219\{[^}]*height:110px/);
    expect(out.html).toContain('M 10 0 C 8.6875');
  });
});
