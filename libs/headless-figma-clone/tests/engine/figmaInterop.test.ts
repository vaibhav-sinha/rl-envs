import { describe, expect, it } from 'vitest';
import {
  normalizeLayoutConstraints,
  normalizeLayoutGridEntry,
  normalizeLayoutGrids,
} from '../../src/engine/figmaInterop.js';

describe('figmaInterop', () => {
  it('maps LEFT_RIGHT constraints to STRETCH', () => {
    expect(
      normalizeLayoutConstraints({ horizontal: 'LEFT_RIGHT', vertical: 'MIN' }, 'constraints')
    ).toEqual({ horizontal: 'STRETCH', vertical: 'MIN' });
  });

  it('converts plugin layoutGrids to internal column count', () => {
    const grids = normalizeLayoutGrids(
      [{ pattern: 'COLUMNS', sectionSize: 80, gutterSize: 16, color: { r: 0, g: 0.3, b: 0.8, a: 0.15 } }],
      400
    );
    expect(grids).toEqual([
      { type: 'COLUMNS', count: 4, gutter: 16, color: { r: 0, g: 0.3, b: 0.8, a: 0.15 } },
    ]);
    expect(normalizeLayoutGridEntry(grids![0], 400, 'layoutGrids[0]').count).toBe(4);
  });

  it('accepts plugin layoutGrids with explicit count', () => {
    expect(
      normalizeLayoutGridEntry(
        {
          pattern: 'COLUMNS',
          alignment: 'MIN',
          sectionSize: 80,
          gutterSize: 16,
          count: 4,
          offset: 16,
        },
        400,
        'layoutGrids[0]'
      )
    ).toEqual({ type: 'COLUMNS', count: 4, gutter: 16, color: undefined });
  });
});
