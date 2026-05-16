import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('instance detached children merged into component master', () => {
  it('applies corner radius and instance geometry from exported children', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/instance-corner-radius.hfc.json'), 'utf8')
    ) as FileEnvelope;
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I10',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });

    expect(out.html).toContain('hfc-component-instance');
    expect(out.html).not.toContain('hfc-instance-detached');
    expect(out.css).toMatch(/\.hfc-node-I10 \.hfc-node-I21\{[^}]*border-radius:16px/);
    expect(out.css).toMatch(/\.hfc-node-I10 \.hfc-node-I21\{[^}]*width:327px/);
    expect(out.css).toMatch(/\.hfc-node-I10 \.hfc-node-I21\{[^}]*height:202px/);
    expect(out.css).toMatch(/\.hfc-node-I10 \.hfc-node-I21\{[^}]*rgba\(230,\s*51,\s*26/);
  });
});
