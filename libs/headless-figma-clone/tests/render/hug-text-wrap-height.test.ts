import { describe, expect, it } from 'vitest';
import { syncHugTextLayoutMetricsDeep } from '../../src/render/autoLayoutIntrinsicSizing.js';
import type { TextNode } from '../../src/model/types.js';

function makeWrappedHeadline(): TextNode {
  return {
    id: 't1',
    name: 'headline',
    type: 'TEXT',
    x: 0,
    y: 0,
    width: 327,
    height: 144,
    characters: 'Fall in Love with Coffee in Blissful Delight!',
    fontSize: 32,
    fontWeight: 600,
    fontName: { family: 'Sora', style: 'SemiBold' },
    textAlignHorizontal: 'CENTER',
    textAutoResize: 'HEIGHT',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'HUG',
    lineHeight: { unit: 'PERCENT', value: 150 },
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true, opacity: 1 }],
  };
}

describe('hug text vertical sizing with textAutoResize HEIGHT', () => {
  it('syncHugTextLayoutMetricsDeep keeps multi-line height for fixed-width wrap text', () => {
    const t = makeWrappedHeadline();
    syncHugTextLayoutMetricsDeep(t);
    expect(t.height).toBe(144);
  });

  it('single-line WIDTH_AND_HEIGHT hug stays one line tall', () => {
    const t: TextNode = {
      ...makeWrappedHeadline(),
      characters: 'Get Started',
      width: 96,
      height: 24,
      fontSize: 16,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      layoutSizingHorizontal: 'HUG',
    };
    syncHugTextLayoutMetricsDeep(t);
    expect(t.height).toBeLessThanOrEqual(28);
  });
});
