import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('shape polygon/star snapshot', () => {
  it('emits svg subtree for POLYGON and STAR', async () => {
    const raw = readFileSync(join(__dirname, '../fixtures/phase3-minimal.valid.json'), 'utf8');
    const envelope = JSON.parse(raw) as FileEnvelope;
    const compiled = designCompiler.compileFirstPage({
      envelope,
      options: { viewportPaddingPx: 0, includeCss: false, inlineCss: false, imageDataUrlByHash: {} },
    });
    const blob = `${compiled.html}\n---CSS---\n${compiled.css}`;
    await expect(blob).toMatchFileSnapshot(join(__dirname, 'shape-polygon-star.snapshot.txt'));
  });
});
