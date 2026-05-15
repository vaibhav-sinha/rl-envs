import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function demo(): FileEnvelope {
  return JSON.parse(readFileSync(join(__dirname, '../fixtures/phase5-demo.hfc.json'), 'utf8')) as FileEnvelope;
}

describe('text path compile', () => {
  it('emits textPath SVG fragment', () => {
    const env = demo();
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I5',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toMatchSnapshot();
  });
});
