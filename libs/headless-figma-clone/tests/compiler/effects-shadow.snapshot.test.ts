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

  it('emits backdrop-filter for BACKGROUND_BLUR', () => {
    const env = loadFx('phase4-nav-grid-mask.json');
    const c = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(c.html).toContain('backdrop-filter:blur(10px)');
  });
});
