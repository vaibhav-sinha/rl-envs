import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('compiler gradients (phase 3)', () => {
  it('linear + radial gradient CSS snapshot (showcase nodes)', () => {
    const path = join(__dirname, '../fixtures/phase3-showcase.hfc.json');
    const envelope = JSON.parse(readFileSync(path, 'utf8')) as FileEnvelope;
    const linear = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I4',
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: false,
        imageDataUrlByHash: buildImageDataUrlForSubtree(envelope, path, 'I4'),
      },
    });
    const radial = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I8',
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: false,
        imageDataUrlByHash: buildImageDataUrlForSubtree(envelope, path, 'I8'),
      },
    });
    const blob = `LINEAR\n${linear.css}\n---\nRADIAL\n${radial.css}`;
    expect(blob).toMatchFileSnapshot(join(__dirname, 'gradient.snapshot.txt'));
  });
});
