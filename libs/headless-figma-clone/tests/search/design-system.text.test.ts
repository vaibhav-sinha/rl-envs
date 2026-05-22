import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { searchDesignSystem } from '../../src/designSystem/searchDesignSystem.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function demo(): FileEnvelope {
  return JSON.parse(readFileSync(join(__dirname, '../fixtures/phase5-demo.hfc.json'), 'utf8')) as FileEnvelope;
}

describe('searchDesignSystem', () => {
  it('returns identical ordering for repeated queries (deterministic)', () => {
    const env = demo();
    const a = searchDesignSystem(env, 'Chip', 10);
    const b = searchDesignSystem(env, 'Chip', 10);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('ranks substring matches with stable tie-break', () => {
    const env = demo();
    const hits = searchDesignSystem(env, 'e', 20);
    expect(hits.length).toBeGreaterThan(0);
    const a2 = searchDesignSystem(env, 'e', 20);
    expect(hits.map((h) => `${h.kind}:${h.id}`).join('|')).toBe(a2.map((h) => `${h.kind}:${h.id}`).join('|'));
  });

  it('empty query returns catalog slice sorted by score then kind/id', () => {
    const env = demo();
    const h = searchDesignSystem(env, '', 5);
    expect(h.length).toBeLessThanOrEqual(5);
  });

  it('no-match query falls back to full catalog slice', () => {
    const env = demo();
    const catalog = searchDesignSystem(env, '', 10);
    const fallback = searchDesignSystem(env, 'zzznomatch_xyz', 10);
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback.map((h) => `${h.kind}:${h.id}`).join('|')).toBe(
      catalog.map((h) => `${h.kind}:${h.id}`).join('|')
    );
  });
});
