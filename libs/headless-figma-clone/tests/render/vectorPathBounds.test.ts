import { describe, expect, it } from 'vitest';
import {
  boundingBoxFromPathData,
  fitShapeBoxToPathData,
  svgViewportForPathData,
} from '../../src/render/vectorPathBounds.js';

describe('vectorPathBounds', () => {
  it('bounds curved path from scenario 39', () => {
    const b = boundingBoxFromPathData('M 80 200 Q 240 80 400 200');
    expect(b.left).toBeCloseTo(80, 0);
    expect(b.top).toBeCloseTo(140, 0);
    expect(b.right).toBeCloseTo(400, 0);
    expect(b.bottom).toBeCloseTo(200, 0);
  });

  it('fitShapeBoxToPathData expands default 100×100 box to tight path bounds', () => {
    const fitted = fitShapeBoxToPathData({ width: 100, height: 100 }, 'M 80 200 Q 240 80 400 200');
    expect(fitted.width).toBe(320);
    expect(fitted.height).toBe(100);
  });

  it('svgViewportForPathData uses normalized 0-origin viewBox', () => {
    const vp = svgViewportForPathData('M 80 200 Q 240 80 400 200');
    expect(vp.viewBox).toBe('0 0 320 60');
    expect(vp.width).toBe(320);
    expect(vp.height).toBe(60);
  });
});
