import { describe, expect, it } from 'vitest';
import type { FrameNode, RectangleNode } from '../../src/model/types.js';
import { constraintPositionCss, flexChildLayoutCss } from '../../src/layout/flexChildCss.js';

describe('flexChildCss', () => {
  const parentRow: FrameNode = {
    id: 'I3',
    type: 'FRAME',
    name: 'Row',
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    layoutMode: 'HORIZONTAL',
    children: [],
  };

  it('emits HUG main-axis flex child styles', () => {
    const child: RectangleNode = {
      id: 'I4',
      type: 'RECTANGLE',
      name: 'Hug',
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'FIXED',
    };
    const css = flexChildLayoutCss(child, true, { absX: 0, absY: 0, width: 40, height: 20 }, parentRow);
    expect(css).toContain('flex:0 0 auto');
    expect(css).toContain('height:20px');
  });

  it('emits absolute positioning inside flex when layoutPositioning is ABSOLUTE', () => {
    const child: RectangleNode = {
      id: 'I4',
      type: 'RECTANGLE',
      name: 'Abs',
      x: 12,
      y: 8,
      width: 30,
      height: 30,
      layoutPositioning: 'ABSOLUTE',
    };
    const css = flexChildLayoutCss(child, true, { absX: 12, absY: 8, width: 30, height: 30 }, parentRow);
    expect(css).toContain('position:absolute');
    expect(css).toContain('left:12px');
    expect(css).toContain('top:8px');
  });

  it('constraintPositionCss emits stretch right/bottom for STRETCH constraints', () => {
    const child: RectangleNode = {
      id: 'I4',
      type: 'RECTANGLE',
      name: 'C',
      x: 10,
      y: 10,
      width: 80,
      height: 40,
      constraints: { horizontal: 'STRETCH', vertical: 'STRETCH' },
    };
    const css = constraintPositionCss(child, 200, 100);
    expect(css).toContain('right:');
    expect(css).toContain('bottom:');
    expect(css).not.toContain('width:80px');
  });

  it('emits min/max width for FILL child in horizontal auto-layout (scenario 28)', () => {
    const child: RectangleNode = {
      id: 'I4',
      type: 'RECTANGLE',
      name: 'Child',
      x: 0,
      y: 0,
      width: 200,
      height: 40,
      layoutSizingHorizontal: 'FILL',
      minWidth: 80,
      maxWidth: 160,
    };
    const css = flexChildLayoutCss(child, true, { absX: 0, absY: 0, width: 200, height: 40 }, parentRow);
    expect(css).toMatch(/flex:\s*1\s+1/);
    expect(css).toContain('min-width:80px');
    expect(css).toContain('max-width:160px');
    expect(css).not.toContain('min-width:0');
  });

  it('uses vertical layout main axis when parent layoutMode is VERTICAL', () => {
    const parentCol: FrameNode = { ...parentRow, layoutMode: 'VERTICAL' };
    const child: RectangleNode = {
      id: 'I4',
      type: 'RECTANGLE',
      name: 'Fill',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      layoutSizingVertical: 'FILL',
      layoutSizingHorizontal: 'FIXED',
    };
    const css = flexChildLayoutCss(child, true, { absX: 0, absY: 0, width: 100, height: 50 }, parentCol);
    expect(css).toMatch(/flex:\s*1\s+1/);
    expect(css).toContain('width:100px');
  });
});
