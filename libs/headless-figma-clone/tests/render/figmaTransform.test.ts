import { describe, expect, it } from 'vitest';
import {
  buildRelativeTransform,
  figmaTopLeftRotationMatrixCss,
  isRotatedAutoLayoutFrame,
  nodeTransformCss,
  rotatePointFigma,
  transformedAxisAlignedBounds,
} from '../../src/render/figmaTransform.js';

describe('figmaTransform', () => {
  it('builds relativeTransform from x/y and rotation', () => {
    const t = buildRelativeTransform({ x: 292, y: 20, rotation: -180 });
    expect(t[0][0]).toBeCloseTo(-1);
    expect(t[0][1]).toBeCloseTo(0);
    expect(t[0][2]).toBe(292);
    expect(t[1][0]).toBeCloseTo(0);
    expect(t[1][1]).toBeCloseTo(-1);
    expect(t[1][2]).toBe(20);
  });

  it('maps 180° top-left rotation to CSS matrix', () => {
    expect(figmaTopLeftRotationMatrixCss(-180)).toBe('matrix(-1,0,0,-1,0,0)');
  });

  it('computes AABB for 180° rotated 24×24 box', () => {
    const b = transformedAxisAlignedBounds(24, 24, -180);
    expect(b.minX).toBeCloseTo(-24);
    expect(b.minY).toBeCloseTo(-24);
    expect(b.maxX).toBeCloseTo(0);
    expect(b.maxY).toBeCloseTo(0);
  });

  it('rotates flex child with inherited auto-layout rotation around center', () => {
    const css = nodeTransformCss(
      { rotation: 0 },
      { insideFlex: true, inheritedAutoLayoutRotationDeg: -180 }
    );
    expect(css).toContain('transform:rotate(180deg)');
    expect(css).toContain('transform-origin:center center');
  });

  it('uses top-left matrix for absolutely positioned rotation', () => {
    const css = nodeTransformCss({ rotation: 45 });
    expect(css).toContain('transform:matrix(');
    expect(css).toContain('transform-origin:top left');
  });

  it('detects rotated auto-layout frames', () => {
    expect(isRotatedAutoLayoutFrame({ layoutMode: 'HORIZONTAL', rotation: -180 })).toBe(true);
    expect(isRotatedAutoLayoutFrame({ layoutMode: 'NONE', rotation: -180 })).toBe(false);
  });

  it('rotatePointFigma matches Figma matrix for 180° at origin', () => {
    const p = rotatePointFigma(0, 0, 6, 6, -180);
    expect(p.x).toBeCloseTo(-6);
    expect(p.y).toBeCloseTo(-6);
  });
});
