import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { buildVariableDefsPayload } from '../../src/variables/resolution.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function normalizeDefs(env: FileEnvelope): unknown {
  const p = buildVariableDefsPayload(env);
  const collections = [...p.collections].sort((a, b) => a.id.localeCompare(b.id));
  for (const c of collections) {
    c.variables = [...c.variables].sort((a, b) => a.id.localeCompare(b.id));
  }
  return { version: p.version, activeModes: p.activeModes, collections };
}

describe('variable defs snapshot (phase 5 demo)', () => {
  it('matches normalized snapshot', () => {
    const env = JSON.parse(
      readFileSync(join(__dirname, '../fixtures/phase5-demo.hfc.json'), 'utf8')
    ) as FileEnvelope;
    expect(JSON.stringify(normalizeDefs(env), null, 2)).toMatchSnapshot();
  });
});
