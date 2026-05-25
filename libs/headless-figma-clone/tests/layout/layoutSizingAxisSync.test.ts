import { describe, expect, it } from 'vitest';
import {
  axisSizingToLayoutSizing,
  layoutSizingToAxisMode,
  syncAxisSizingModesFromLayoutSizing,
  syncLayoutSizingFromAxisSizingModes,
} from '../../src/layout/layoutSizingAxisSync.js';
import type { FrameNode } from '../../src/model/types.js';

function mkFrame(partial: Partial<FrameNode>): FrameNode {
  return {
    id: 'f',
    name: 'f',
    type: 'FRAME',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    children: [],
    ...partial,
  };
}

describe('layoutSizingAxisSync', () => {
  it('maps HUG/FIXED to AUTO/FIXED; FILL is not an axis mode', () => {
    expect(layoutSizingToAxisMode('HUG')).toBe('AUTO');
    expect(layoutSizingToAxisMode('FIXED')).toBe('FIXED');
    expect(layoutSizingToAxisMode('FILL')).toBeUndefined();
    expect(axisSizingToLayoutSizing('AUTO')).toBe('HUG');
    expect(axisSizingToLayoutSizing('FIXED')).toBe('FIXED');
  });

  it('HORIZONTAL: layoutSizingVertical HUG → counterAxisSizingMode AUTO', () => {
    const f = mkFrame({
      layoutMode: 'HORIZONTAL',
      layoutSizingVertical: 'HUG',
      counterAxisSizingMode: undefined,
    });
    syncAxisSizingModesFromLayoutSizing(f);
    expect(f.counterAxisSizingMode).toBe('AUTO');
    expect(f.primaryAxisSizingMode).toBeUndefined();
  });

  it('HORIZONTAL: layoutSizingHorizontal FIXED → primaryAxisSizingMode FIXED', () => {
    const f = mkFrame({
      layoutMode: 'HORIZONTAL',
      layoutSizingHorizontal: 'FIXED',
    });
    syncAxisSizingModesFromLayoutSizing(f);
    expect(f.primaryAxisSizingMode).toBe('FIXED');
  });

  it('VERTICAL: layoutSizingVertical HUG → primaryAxisSizingMode AUTO', () => {
    const f = mkFrame({
      layoutMode: 'VERTICAL',
      layoutSizingVertical: 'HUG',
    });
    syncAxisSizingModesFromLayoutSizing(f);
    expect(f.primaryAxisSizingMode).toBe('AUTO');
  });

  it('VERTICAL: layoutSizingHorizontal HUG → counterAxisSizingMode AUTO', () => {
    const f = mkFrame({
      layoutMode: 'VERTICAL',
      layoutSizingHorizontal: 'HUG',
    });
    syncAxisSizingModesFromLayoutSizing(f);
    expect(f.counterAxisSizingMode).toBe('AUTO');
  });

  it('syncLayoutSizingFromAxisSizingModes mirrors axis → shorthand', () => {
    const f = mkFrame({
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'FIXED',
    });
    syncLayoutSizingFromAxisSizingModes(f);
    expect(f.layoutSizingHorizontal).toBe('HUG');
    expect(f.layoutSizingVertical).toBe('FIXED');
  });

  it('ignores GRID layoutMode', () => {
    const f = mkFrame({
      layoutMode: 'GRID',
      layoutSizingVertical: 'HUG',
      counterAxisSizingMode: undefined,
    });
    syncAxisSizingModesFromLayoutSizing(f);
    expect(f.counterAxisSizingMode).toBeUndefined();
  });
});
