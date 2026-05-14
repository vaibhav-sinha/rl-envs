import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFx(name: string): FileEnvelope {
  return JSON.parse(readFileSync(join(__dirname, '../fixtures', name), 'utf8')) as FileEnvelope;
}

describe('compiler text ranges', () => {
  it('matches snapshot for mixed styles and hyperlink (phase2-minimal)', () => {
    const env = loadFx('phase2-minimal.valid.json');
    const compiled = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    const bundle = `${compiled.html}\n---CSS---\n${compiled.css}`;
    expect(bundle).toMatchFileSnapshot('text-ranges.snapshot.txt');
  });
});

describe('compiler frame background and clip', () => {
  it('adds overflow:hidden when clipsContent is true', () => {
    const env = loadFx('phase2-exit.json');
    const c = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I4',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(c.html).toContain('overflow:hidden');
  });

  it('does not add overflow when clipsContent is false on inner leaf frame', () => {
    const env = loadFx('phase2-exit.json');
    const c = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I5',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(c.html).not.toContain('overflow:hidden');
  });
});

describe('compiler effects shadow', () => {
  it('emits box-shadow for DROP_SHADOW', () => {
    const env = loadFx('phase2-exit.json');
    const c = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(c.html).toContain('box-shadow:');
  });
});

describe('compiler rotation and opacity', () => {
  it('includes transform for rotated frame in extracted CSS (inlineCss false)', () => {
    const env = loadFx('phase2-exit.json');
    const c = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I6',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(c.css).toContain('rotate(12deg)');
    const envT = loadFx('phase2-minimal.valid.json');
    const ct = designCompiler.compileSubtree({
      envelope: envT,
      rootNodeId: 'I4',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(ct.css).toContain('hfc-node-I4');
  });
});
