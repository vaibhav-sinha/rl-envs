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

describe('compiler rotation and opacity', () => {
  it('includes transform for rotated frame in extracted CSS (inlineCss false)', () => {
    const env = loadFx('phase2-exit.json');
    const c = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I6',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(c.css).toContain('transform:matrix(');
    expect(c.css).toContain('transform-origin:top left');
    const envT = loadFx('phase2-minimal.valid.json');
    const ct = designCompiler.compileSubtree({
      envelope: envT,
      rootNodeId: 'I4',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(ct.css).toContain('hfc-node-I4');
  });
});
