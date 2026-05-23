import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';

const SALE_HFC = join(
  import.meta.dirname,
  '../../../../envs/figma-design/tasks/oker-create-sale-section/environment/design.hfc.json'
);

describe('BrandSpotlight instance merge (2415:175378)', () => {
  it('applies detached overrides for hero image and Chumbak copy', () => {
    const env = JSON.parse(readFileSync(SALE_HFC, 'utf8')) as FileEnvelope;
    const rootId = resolveHfcNodeIdBySourceFigmaId(env, '2415:175378');
    expect(rootId).toBe('I9123');

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: rootId!,
      options: {
        viewportPaddingPx: 8,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: buildImageDataUrlForSubtree(env, SALE_HFC, rootId!),
      },
    });

    expect(out.warnings.some((w) => w.startsWith('instance_merge_unmatched_child:'))).toBe(false);
    expect(out.warnings.some((w) => w.startsWith('missing_image_data_url:rect:I49054'))).toBe(false);
    expect(out.html).toContain('Chumbak');
    expect(out.html).toContain('The best gifts for your loved ones tying the knot');
    expect(out.html).not.toContain('Jaipur Rugs');
    expect(out.html).toContain('data:image/png;base64,');
  });
});
