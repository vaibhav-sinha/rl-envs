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

describe('phase7 constraints and sizing compile', () => {
  it('emits flex:1 for FILL horizontal child in auto-layout row', () => {
    const env = load('phase7-layout-sizing.hfc.json');
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toContain('display:flex');
    const bundle = out.html + out.css;
    expect(bundle).toMatch(/flex:\s*1\s+1/);
    expect(out.html).toContain('hfc-node-I4');
    expect(out.html).toContain('hfc-node-I5');
  });

  it('emits constraint stretch styles for constrained child', () => {
    const env = load('phase7-layout-sizing.hfc.json');
    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I6',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const bundle = out.html + out.css;
    expect(bundle).toContain('right:');
    expect(bundle).toContain('bottom:');
  });
});
