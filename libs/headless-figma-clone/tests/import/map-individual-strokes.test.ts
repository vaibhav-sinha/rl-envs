import { describe, expect, it } from 'vitest';
import { mapIndividualStrokes } from '../../src/import/importNodeMappers.js';

describe('mapIndividualStrokes', () => {
  it('maps Figma strokeTopWeight-style props to individualStrokeWeights', () => {
    expect(
      mapIndividualStrokes({
        strokeTopWeight: 1,
        strokeRightWeight: 0,
        strokeBottomWeight: 0,
        strokeLeftWeight: 0,
      })
    ).toEqual({
      individualStrokeWeights: { top: 1, right: 0, bottom: 0, left: 0 },
    });
  });

  it('maps individualStrokeWeights object with strokeWeight fallback', () => {
    expect(
      mapIndividualStrokes({
        strokeWeight: 2,
        individualStrokeWeights: { top: 4, left: 1 },
      })
    ).toEqual({
      individualStrokeWeights: { top: 4, right: 2, bottom: 2, left: 1 },
    });
  });

  it('prefers explicit side props over individualStrokeWeights object', () => {
    expect(
      mapIndividualStrokes({
        strokeTopWeight: 1,
        strokeRightWeight: 1,
        individualStrokeWeights: { top: 9, right: 9, bottom: 9, left: 9 },
      })
    ).toEqual({
      individualStrokeWeights: { top: 1, right: 1, bottom: 0, left: 0 },
    });
  });
});
