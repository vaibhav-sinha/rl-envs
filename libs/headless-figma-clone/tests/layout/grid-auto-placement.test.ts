import { describe, expect, it } from 'vitest';
import { buildGridPlacementIndex, gridChildPlacementCss } from '../../src/layout/gridLayout.js';
import type { FrameNode, RectangleNode } from '../../src/model/types.js';

function rect(id: string, overrides: Partial<RectangleNode> = {}): RectangleNode {
  return {
    id,
    type: 'RECTANGLE',
    name: id,
    x: 0,
    y: 0,
    width: 40,
    height: 40,
    ...overrides,
  };
}

describe('grid auto-placement', () => {
  it('places children row-major when anchors are unset', () => {
    const children = [rect('A'), rect('B'), rect('C'), rect('D'), rect('E'), rect('F')];
    const grid: FrameNode = {
      id: 'G',
      type: 'FRAME',
      name: 'Grid',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      layoutMode: 'GRID',
      gridRowCount: 2,
      gridColumnCount: 3,
      children,
    };
    const placements = buildGridPlacementIndex(grid, children);
    expect(placements.get('A')).toEqual({ row: 0, col: 0 });
    expect(placements.get('B')).toEqual({ row: 0, col: 1 });
    expect(placements.get('C')).toEqual({ row: 0, col: 2 });
    expect(placements.get('D')).toEqual({ row: 1, col: 0 });
    expect(placements.get('E')).toEqual({ row: 1, col: 1 });
    expect(placements.get('F')).toEqual({ row: 1, col: 2 });
    expect(gridChildPlacementCss(children[4]!, grid)).toContain('grid-row:2');
    expect(gridChildPlacementCss(children[4]!, grid)).toContain('grid-column:2');
  });

  it('skips cells occupied by explicit anchors and spans', () => {
    const hero = rect('H', { gridRowAnchorIndex: 0, gridColumnAnchorIndex: 0, gridRowSpan: 2, gridColumnSpan: 2 });
    const side = rect('S');
    const grid: FrameNode = {
      id: 'G',
      type: 'FRAME',
      name: 'Grid',
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      layoutMode: 'GRID',
      gridRowCount: 2,
      gridColumnCount: 3,
      children: [hero, side],
    };
    const placements = buildGridPlacementIndex(grid, grid.children);
    expect(placements.get('H')).toEqual({ row: 0, col: 0 });
    expect(placements.get('S')).toEqual({ row: 0, col: 2 });
  });
});
