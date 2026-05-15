import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { buildVariableDefsPayload } from '../../src/variables/resolution.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDemo(): FileEnvelope {
  const p = join(__dirname, '../fixtures/phase5-demo.hfc.json');
  return JSON.parse(readFileSync(p, 'utf8')) as FileEnvelope;
}

describe('getVariableDefs payload', () => {
  it('includes version, activeModes, and resolved COLOR values', () => {
    const env = loadDemo();
    const p = buildVariableDefsPayload(env);
    expect(p.version).toBe(1);
    expect(p.activeModes.VCOL1).toBe('VM1');
    const v = p.collections.find((c) => c.id === 'VCOL1')?.variables.find((x) => x.id === 'VV1');
    expect(v?.resolvedType).toBe('COLOR');
    expect(v?.value).toEqual({ type: 'COLOR', color: { r: 0.12, g: 0.35, b: 0.92 } });
  });
});
