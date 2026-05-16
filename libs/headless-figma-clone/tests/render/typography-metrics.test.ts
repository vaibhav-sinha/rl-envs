import { describe, expect, it } from 'vitest';
import {
  effectiveTextBaseFontSizePx,
  effectiveTextMaxFontSizePx,
  hugTextLineHeightPxFromTypography,
} from '../../src/render/typographyCss.js';
import type { TextNode } from '../../src/model/types.js';

function textNode(partial: Partial<TextNode> & Pick<TextNode, 'fontSize'>): TextNode {
  return {
    id: 't1',
    type: 'TEXT',
    name: 'T',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    characters: 'abc',
    ...partial,
  };
}

describe('effectiveTextMaxFontSizePx', () => {
  it('uses base fontSize when no styled segments', () => {
    const t = textNode({ fontSize: 14 });
    expect(effectiveTextMaxFontSizePx(t)).toBe(14);
    expect(effectiveTextBaseFontSizePx(t)).toBe(14);
  });

  it('returns max of base and styled segment font sizes', () => {
    const t = textNode({
      fontSize: 14,
      styledSegments: [
        { start: 0, end: 3, style: { fontSize: 24 } },
        { start: 4, end: 7, style: { fontSize: 18 } },
      ],
    });
    expect(effectiveTextMaxFontSizePx(t)).toBe(24);
    expect(hugTextLineHeightPxFromTypography(effectiveTextMaxFontSizePx(t))).toBe(26);
  });
});
