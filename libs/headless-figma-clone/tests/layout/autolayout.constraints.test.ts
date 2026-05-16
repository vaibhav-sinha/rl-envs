import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('autolayout constraints (flex child)', () => {
  it('respects layoutGrow on flex child via CSS flex property', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/phase4-compile-harness.hfc.json'), 'utf8')
    ) as FileEnvelope;
    const page = env.document.children[0]!;
    const frame = page.children[0] as import('../../src/model/types.js').FrameNode;
    const first = frame.children[0]!;
    (first as { layoutGrow?: number }).layoutGrow = 2;

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: frame.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('flex:2 0 auto');
  });
});
