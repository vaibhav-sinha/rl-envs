import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('compile-only path does not mutate source envelope', () => {
  it('leaves in-memory envelope unchanged after compileSubtree', () => {
    const raw = readFileSync(join(__dirname, '../fixtures/phase4-nav-grid-mask.json'), 'utf8');
    const env = JSON.parse(raw) as FileEnvelope;
    const before = JSON.stringify(env);
    designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(JSON.stringify(env)).toBe(before);
  });
});
