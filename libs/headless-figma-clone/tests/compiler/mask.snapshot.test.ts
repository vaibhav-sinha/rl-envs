import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('mask cluster', () => {
  it('wraps masked siblings with svg mask ref', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/phase4-nav-grid-mask.json'), 'utf8')
    ) as FileEnvelope;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('hfc-mask-wrap');
    expect(out.html).toContain('data-hfc-mask="I8"');
    expect(out.html).toContain('hfc-svg-mask-I8');
    expect(out.html).toContain('hfc-masked-inner');
    expect(out.html).toMatch(/mask:url\(#hfc-svg-mask-I8\)/);
  });
});
