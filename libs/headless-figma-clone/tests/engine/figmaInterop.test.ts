import { describe, expect, it } from 'vitest';
import {
  normalizeLayoutConstraints,
  normalizeLayoutGridEntry,
  normalizeLayoutGrids,
  validatePluginLayoutGrids,
} from '../../src/engine/figmaInterop.js';
import { ValidationErr } from '../../src/util/errors.js';

describe('figmaInterop', () => {
  it('rejects REST-style constraint strings (Plugin API uses STRETCH, not LEFT_RIGHT / TOP_BOTTOM)', () => {
    expect(() =>
      normalizeLayoutConstraints({ horizontal: 'LEFT_RIGHT', vertical: 'MIN' }, 'constraints')
    ).toThrow(ValidationErr);
    expect(() =>
      normalizeLayoutConstraints({ horizontal: 'CENTER', vertical: 'TOP_BOTTOM' }, 'constraints')
    ).toThrow(ValidationErr);
    expect(normalizeLayoutConstraints({ horizontal: 'STRETCH', vertical: 'MIN' }, 'constraints')).toEqual({
      horizontal: 'STRETCH',
      vertical: 'MIN',
    });
  });

  it('converts valid plugin layoutGrids to internal column count', () => {
    const grids = normalizeLayoutGrids(
      [
        {
          pattern: 'COLUMNS',
          alignment: 'MIN',
          sectionSize: 80,
          gutterSize: 16,
          count: 4,
          offset: 16,
          color: { r: 0, g: 0.3, b: 0.8, a: 0.15 },
        },
      ],
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

  it('rejects plugin shorthand missing alignment, count, or offset (matches Figma)', () => {
    expect(() =>
      validatePluginLayoutGrids(
        [{ pattern: 'COLUMNS', sectionSize: 80, gutterSize: 16, color: { r: 0, g: 0.3, b: 0.8, a: 0.15 } }],
        'layoutGrids'
      )
    ).toThrow(ValidationErr);
    expect(() =>
      normalizeLayoutGrids(
        [{ pattern: 'COLUMNS', sectionSize: 80, gutterSize: 16, color: { r: 0, g: 0.3, b: 0.8, a: 0.15 } }],
        400
      )
    ).toThrow(ValidationErr);
  });

  it('accepts count Infinity as Auto with sectionSize (Plugin API)', () => {
    const grids = normalizeLayoutGrids(
      [
        {
          pattern: 'COLUMNS',
          alignment: 'MIN',
          sectionSize: 80,
          gutterSize: 16,
          count: Infinity,
          offset: 0,
          color: { r: 0, g: 0.3, b: 0.8, a: 0.15 },
        },
      ],
      400
    );
    expect(grids).toEqual([
      { type: 'COLUMNS', count: 4, gutter: 16, color: { r: 0, g: 0.3, b: 0.8, a: 0.15 } },
    ]);
  });

  it('rejects count null (Plugin API uses Infinity for Auto, not null)', () => {
    expect(() =>
      validatePluginLayoutGrids(
        [
          {
            pattern: 'COLUMNS',
            alignment: 'MIN',
            sectionSize: 80,
            gutterSize: 16,
            count: null,
            offset: 0,
            color: { r: 0, g: 0.3, b: 0.8, a: 0.15 },
          },
        ],
        'layoutGrids'
      )
    ).toThrow(ValidationErr);
  });
});
