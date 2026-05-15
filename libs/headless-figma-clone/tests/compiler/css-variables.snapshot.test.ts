import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function minimal(): FileEnvelope {
  return JSON.parse(readFileSync(join(__dirname, '../fixtures/phase5-minimal.valid.json'), 'utf8')) as FileEnvelope;
}

describe('css-variables snapshot contract', () => {
  it('defines :root variables and uses var() for VARIABLE_COLOR fills', () => {
    const env = minimal();
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I4',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(out.css).toMatchSnapshot();
    expect(out.html + out.css).toContain('var(--hfc-var-V1)');
  });
});
