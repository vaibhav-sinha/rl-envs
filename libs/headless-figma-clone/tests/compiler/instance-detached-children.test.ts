import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';

const COFFEE_HFC =
  'C:/Users/vaibh/.headless-figma-clone/workspace/Coffee-Shop-Mobile-App-Design-Community.hfc.json';

describe('instance detached children fallback', () => {
  it('merges detached geometry into component masters when mainComponent resolves', () => {
    const env = JSON.parse(readFileSync(COFFEE_HFC, 'utf8')) as FileEnvelope;
    const out = designCompiler.compileFirstPage({
      envelope: env,
      pageId: 'I1053',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(out.warnings.some((w) => w.startsWith('missing_component:'))).toBe(false);
    expect(out.html).not.toContain('hfc-instance-detached');
    const blob = out.css || out.html;
    expect(blob).toMatch(/\.hfc-node-I1331 \.hfc-node-I158\{[^}]*border-radius:16px/);
  });

  it('renders image fills when mainComponentId is unresolved but children are present', () => {
    const env = JSON.parse(readFileSync(COFFEE_HFC, 'utf8')) as FileEnvelope;
    const onboardingHash = '5f4f72be43088ce8d105aeb68eee701e348708450c1881fd1d2483788729260f';

    const out = designCompiler.compileFirstPage({
      envelope: env,
      pageId: 'I1053',
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: buildImageDataUrlForSubtree(env, COFFEE_HFC, 'I1053'),
      },
    });

    const imgMap = buildImageDataUrlForSubtree(env, COFFEE_HFC, 'I1053');
    expect(out.warnings.some((w) => w.startsWith('missing_component:'))).toBe(false);
    expect(out.html).toContain(imgMap[onboardingHash]!.slice(0, 48));
  });
});
