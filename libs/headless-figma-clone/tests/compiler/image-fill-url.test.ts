import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HASH = 'c845fbcaf67dc1613b50774f0b4b25f379b10f7659dfba75545e325baa44f946';

describe('compiler image fill URL policy', () => {
  it('uses imageDataUrlByHash entries as background-image url() targets', () => {
    const path = join(__dirname, '../fixtures/phase3-showcase.hfc.json');
    const envelope = JSON.parse(readFileSync(path, 'utf8')) as FileEnvelope;
    const assetUrl = `http://127.0.0.1:3847/assets/${HASH}`;
    const star = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I7',
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: { [HASH]: assetUrl },
      },
    });
    expect(star.html).toContain(`href="${assetUrl}"`);
  });
});
