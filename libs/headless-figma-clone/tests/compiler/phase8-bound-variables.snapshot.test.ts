import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('phase8 bound variables in CSS', () => {
  it('emits :root float vars and var() for frame padding + text font-size', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/phase8-variables-styles.hfc.json'), 'utf8')
    ) as FileEnvelope;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { includeCss: true, inlineCss: false, viewportPaddingPx: 0 },
    });
    expect(out.css).toContain('--hfc-var-VV8PAD:24px');
    expect(out.html).toMatch(/padding:var\(--hfc-var-VV8PAD/);
    expect(out.html).toMatch(/font-size:var\(--hfc-var-VV8PAD/);
  });
});
