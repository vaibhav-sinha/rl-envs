import { describe, expect, it } from 'vitest';
import { mapInstanceOverrides } from '../../src/import/importNodeMappers.js';
import type { FigmaIdMap } from '../../src/import/idMap.js';

class TestIdMap implements FigmaIdMap {
  private map = new Map<string, string>();
  allocate(figmaId: string): string {
    const id = `I_${figmaId.replace(/:/g, '_')}`;
    this.map.set(figmaId, id);
    return id;
  }
  get(figmaId: string): string | undefined {
    return this.map.get(figmaId);
  }
}

describe('mapInstanceOverrides expanded', () => {
  it('imports text alignment and visibility overrides', () => {
    const idMap = new TestIdMap();
    const out = mapInstanceOverrides(
      {
        '24:6583': {
          textAlignHorizontal: 'CENTER',
          characters: '1',
          visible: true,
        },
      },
      idMap,
      () => undefined
    );
    expect(out).toBeDefined();
    const entry = Object.values(out!)[0]!;
    expect(entry.textAlignHorizontal).toBe('CENTER');
    expect(entry.characters).toBe('1');
    expect(entry.visible).toBe(true);
  });
});
