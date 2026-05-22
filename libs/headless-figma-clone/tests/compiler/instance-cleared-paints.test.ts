import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(): FileEnvelope {
  return JSON.parse(
    readFileSync(join(__dirname, '../fixtures/instance-cleared-paints.hfc.json'), 'utf8')
  ) as FileEnvelope;
}

describe('instance cleared root paints', () => {
  it('does not render component master fill or stroke on cleared instance', () => {
    const env = loadFixture();
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });

    const clearedRootRule = out.css.match(/\.hfc-node-I10 \.hfc-node-I20\{[^}]*\}/)?.[0] ?? '';
    expect(clearedRootRule).not.toMatch(/rgba\(255,\s*255,\s*255/);
    expect(clearedRootRule).not.toMatch(/rgba\(225,\s*225,\s*225/);
    expect(clearedRootRule).not.toMatch(/border:[^;]*rgba\(225/);

    const inheritedRootRule = out.css.match(/\.hfc-node-I11 \.hfc-node-I20\{[^}]*\}/)?.[0] ?? '';
    expect(inheritedRootRule).toMatch(/rgba\(255,\s*255,\s*255/);
    expect(inheritedRootRule).toMatch(/border:[^;]*rgba\(225/);
  });

  it('still renders label text inside cleared instance', () => {
    const env = loadFixture();
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(out.html).toContain('Resend code in 1:00');
  });

  it('clears nested frame paints from detached children merge', () => {
    const env = loadFixture();
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });

    const nestedClearedRule = out.css.match(/\.hfc-node-I12 \.hfc-node-I20\{[^}]*\}/)?.[0] ?? '';
    expect(nestedClearedRule).not.toMatch(/rgba\(255,\s*255,\s*255/);
    expect(nestedClearedRule).not.toMatch(/border:[^;]*rgba\(225/);
  });
});
