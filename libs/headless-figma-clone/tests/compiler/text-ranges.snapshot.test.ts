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
    expect(bundle).toMatchFileSnapshot(join(__dirname, 'text-ranges.snapshot.txt'));
  });
});
