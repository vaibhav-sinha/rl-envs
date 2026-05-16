import { describe, expect, it } from 'vitest';
import { mergeTypographyFromText, textDecorationCss } from '../../src/render/typographyCss.js';
import type { TextNode } from '../../src/model/types.js';

function textNode(partial: Partial<TextNode>): TextNode {
  return {
    id: 't1',
    type: 'TEXT',
    name: 'T',
    x: 0,
    y: 0,
    width: 100,
    height: 24,
    characters: 'abc',
    fontSize: 14,
    ...partial,
  };
}

describe('textDecorationCss', () => {
  it('emits line-through for strikethrough', () => {
    expect(textDecorationCss({ type: 'STRIKETHROUGH' })).toContain('text-decoration-line:line-through');
  });
});

describe('mergeTypographyFromText', () => {
  it('falls back to node-level textDecoration when range style omits it', () => {
    const t = textNode({ textDecoration: { type: 'STRIKETHROUGH' } });
    expect(mergeTypographyFromText(t).textDecoration).toEqual({ type: 'STRIKETHROUGH' });
    expect(mergeTypographyFromText(t, {}).textDecoration).toEqual({ type: 'STRIKETHROUGH' });
  });
});
