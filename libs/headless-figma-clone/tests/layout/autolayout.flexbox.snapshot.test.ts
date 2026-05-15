import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function load(name: string): FileEnvelope {
  return JSON.parse(readFileSync(join(__dirname, '../fixtures', name), 'utf8')) as FileEnvelope;
}

describe('autolayout flexbox snapshot', () => {
  it('emits display:flex for horizontal auto-layout frame', () => {
    const env = load('phase4-compile-harness.hfc.json');
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('display:flex');
    expect(out.html).toContain('flex-direction:row');
    expect(out.html).toContain('hfc-frame-flex-I3');
  });

  it('packs wrapped rows at the start with separate row/column gaps', () => {
    const env = load('phase4-nav-grid-mask.json');
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I4',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('flex-wrap:wrap');
    expect(out.html).toContain('column-gap:8px');
    expect(out.html).toContain('row-gap:8px');
    expect(out.html).toContain('align-content:center');
    expect(out.html).not.toContain('align-content:stretch');
  });

  it('gives flex children explicit cross-axis size when layoutSizing is unset', () => {
    const env = load('phase4-compile-harness.hfc.json');
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(out.css).toContain('.hfc-node-I4{');
    expect(out.css).toMatch(/\.hfc-node-I4\{[^}]*height:28px/);
    expect(out.css).not.toMatch(/\.hfc-node-I4\{[^}]*height:auto/);
  });
});
