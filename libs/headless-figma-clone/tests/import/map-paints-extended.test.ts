import { describe, expect, it } from 'vitest';
import { mapPaintsExtended } from '../../src/import/importNodeMappers.js';
import type { FigmaIdMap } from '../../src/import/idMap.js';

class TestIdMap implements FigmaIdMap {
  allocate(figmaId: string): string {
    return `I_${figmaId}`;
  }
  get(): string | undefined {
    return undefined;
  }
}

describe('mapPaintsExtended', () => {
  it('preserves empty array as cleared paints', () => {
    const out = mapPaintsExtended([], () => undefined, new TestIdMap());
    expect(out).toEqual([]);
  });

  it('returns undefined when raw is undefined', () => {
    const out = mapPaintsExtended(undefined, () => undefined, new TestIdMap());
    expect(out).toBeUndefined();
  });
});
