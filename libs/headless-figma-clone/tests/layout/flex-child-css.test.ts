import { describe, expect, it } from 'vitest';
import type { FrameNode, InstanceNode, RectangleNode, TextNode } from '../../src/model/types.js';
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

  it('emits HUG instance with fixed main-axis basis and no shrink in a horizontal row', () => {
    const child: InstanceNode = {
      id: 'I9150',
      type: 'INSTANCE',
      name: 'ProductUI',
      x: 0,
      y: 0,
      width: 220,
      height: 298,
      mainComponentId: 'I74183',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      layoutGrow: 0,
    };
    const css = flexChildLayoutCss(child, true, { absX: 0, absY: 0, width: 220, height: 298 }, parentRow);
    expect(css).toContain('flex:0 0 220px');
    expect(css).not.toContain('flex:0 1 auto');
    expect(css).toContain('height:298px');
    expect(css).not.toContain('height:auto');
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

  it('constraintPositionCss centers with margin offset from top/left:50% (scenarios 78–79)', () => {
    const horiz: RectangleNode = {
      id: 'I78',
      type: 'RECTANGLE',
      name: 'CenterH',
      x: 20,
      y: 0,
      width: 80,
      height: 40,
      constraints: { horizontal: 'CENTER', vertical: 'MIN' },
    };
    expect(constraintPositionCss(horiz, 120, 220)).toContain('margin-left:-40px');

    const vert: RectangleNode = {
      id: 'I79',
      type: 'RECTANGLE',
      name: 'CenterV',
      x: 0,
      y: 24,
      width: 100,
      height: 32,
      constraints: { horizontal: 'MIN', vertical: 'CENTER' },
    };
    expect(constraintPositionCss(vert, 360, 80)).toContain('margin-top:-16px');
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

  it('implicit layout sizing does not flex-shrink fixed-size rects (scenario 99 progress bar)', () => {
    const parentCol: FrameNode = { ...parentRow, layoutMode: 'VERTICAL' };
    const bar: RectangleNode = {
      id: 'I13',
      type: 'RECTANGLE',
      name: 'Bar',
      x: 0,
      y: 0,
      width: 108,
      height: 5,
    };
    const css = flexChildLayoutCss(bar, true, { absX: 0, absY: 0, width: 108, height: 5 }, parentCol);
    expect(css).toMatch(/flex:\s*0\s+0\s+5px/);
    expect(css).toContain('width:108px');
  });

  it('does not center text horizontally in vertical auto-layout when textAlignVertical is CENTER', () => {
    const parentCol: FrameNode = { ...parentRow, layoutMode: 'VERTICAL', width: 480, height: 100 };
    const title = {
      id: 'I9288',
      type: 'TEXT',
      name: 'Popular collections',
      x: 0,
      y: 0,
      width: 328,
      height: 20,
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'HUG',
      textAlignVertical: 'CENTER',
      textAlignHorizontal: 'LEFT',
    } as TextNode;
    const css = flexChildLayoutCss(title, true, { absX: 0, absY: 0, width: 328, height: 20 }, parentCol);
    expect(css).not.toContain('align-self:center');
  });

  it('centers text vertically in horizontal auto-layout when textAlignVertical is CENTER', () => {
    const parentRowTall: FrameNode = { ...parentRow, height: 100 };
    const title = {
      id: 'I1',
      type: 'TEXT',
      name: 'Label',
      x: 0,
      y: 40,
      width: 200,
      height: 20,
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'HUG',
      textAlignVertical: 'CENTER',
      textAlignHorizontal: 'LEFT',
    } as TextNode;
    const css = flexChildLayoutCss(title, true, { absX: 0, absY: 40, width: 200, height: 20 }, parentRowTall);
    expect(css).toContain('align-self:center');
  });
});
