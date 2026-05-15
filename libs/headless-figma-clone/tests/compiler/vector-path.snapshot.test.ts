import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('vector path compile', () => {
  it('embeds path d and hfc-vector-svg', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/phase4-nav-grid-mask.json'), 'utf8')
    ) as FileEnvelope;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('hfc-vector-svg');
    expect(out.html).toContain('M24,4 L44,40 L4,40 Z');
    expect(out.html).toContain('fill-rule="nonzero"');
  });
});
