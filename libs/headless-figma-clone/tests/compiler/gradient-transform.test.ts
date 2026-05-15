import { describe, expect, it } from 'vitest';
import { linearGradientCss, radialGradientCss } from '../../src/render/gradientCss.js';
import type { GradientPaint } from '../../src/model/types.js';

describe('gradientCss gradientTransform', () => {
  it('maps scenario-12 radial transform to top-left focal point', () => {
    const g: GradientPaint = {
      type: 'GRADIENT_RADIAL',
      gradientTransform: [
        [1, 0, 0.5],
        [0, 1, 0.5],
      ],
      gradientStops: [
        { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } },
        { position: 1, color: { r: 0.2, g: 0.1, b: 0.6, a: 1 } },
      ],
    };
    expect(radialGradientCss(g)).toContain('at 0% 0%');
    expect(radialGradientCss(g)).toMatch(/radial-gradient\(50% 50% at 0% 0%/);
  });

  it('keeps identity linear gradient horizontal', () => {
    const g: GradientPaint = {
      type: 'GRADIENT_LINEAR',
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      gradientStops: [
        { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
      ],
    };
    expect(linearGradientCss(g)).toMatch(/^linear-gradient\(90deg,/);
  });
});
