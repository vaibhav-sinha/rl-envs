import { describe, expect, it } from 'vitest';
import { applySideStrokeWeightPatch } from '../../src/engine/sideStrokeWeights.js';
import type { RectangleNode } from '../../src/model/types.js';

describe('side stroke weight patch', () => {
  it('maps strokeTopWeight to individualStrokeWeights.top', () => {
    const r: RectangleNode = {
      id: 'R1',
      type: 'RECTANGLE',
      name: 'R',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      strokeWeight: 2,
    };
    applySideStrokeWeightPatch(r, { strokeTopWeight: 4, strokeLeftWeight: 1 });
    expect(r.individualStrokeWeights).toEqual({ top: 4, right: 2, bottom: 2, left: 1 });
  });
});
