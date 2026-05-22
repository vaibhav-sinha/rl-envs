import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('compiler stroke and blend (phase 3)', () => {
  it('polygon dash + rectangle multiply blend snapshot', () => {
    const path = join(__dirname, '../fixtures/phase3-showcase.hfc.json');
    const envelope = JSON.parse(readFileSync(path, 'utf8')) as FileEnvelope;
    const poly = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I6',
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: buildImageDataUrlForSubtree(envelope, path, 'I6'),
      },
    });
    const blended = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I4',
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: buildImageDataUrlForSubtree(envelope, path, 'I4'),
      },
    });
    const blob = `POLYGON\n${poly.html}\n---\nBLEND_RECT\n${blended.html}`;
    expect(blob).toMatchFileSnapshot(join(__dirname, 'stroke-and-blend.snapshot.txt'));
  });
});
