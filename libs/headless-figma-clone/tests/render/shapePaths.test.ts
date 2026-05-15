import { describe, expect, it } from 'vitest';
import {
  ellipseArcPathD,
  isPlainFullEllipse,
  normalizeClockwiseSweep,
} from '../../src/render/shapePaths.js';

describe('shapePaths ellipse arc', () => {
  it('scenario 40 arc ring is not a plain full ellipse', () => {
    const arc = { startingAngle: 0, endingAngle: Math.PI * 1.25, innerRadius: 0.55 };
    expect(isPlainFullEllipse(arc)).toBe(false);
    const d = ellipseArcPathD(200, 200, arc);
    expect(d).toMatch(/^M/);
    expect(d).toMatch(/ L/);
    expect(d.endsWith(' Z')).toBe(true);
    expect(d).not.toContain(' A');
  });

  it('half pie uses center line', () => {
    const d = ellipseArcPathD(100, 100, { startingAngle: 0, endingAngle: Math.PI, innerRadius: 0 });
    expect(d).toContain(' L50,50 Z');
  });

  it('full donut closes with inner and outer rings', () => {
    const d = ellipseArcPathD(100, 100, {
      startingAngle: 0,
      endingAngle: Math.PI * 2,
      innerRadius: 0.5,
    });
    expect(d.match(/ L/g)?.length).toBeGreaterThan(16);
    expect(d.endsWith(' Z')).toBe(true);
  });

  it('normalizeClockwiseSweep wraps negative delta', () => {
    expect(normalizeClockwiseSweep(Math.PI, 0)).toBeCloseTo(Math.PI, 5);
  });
});
