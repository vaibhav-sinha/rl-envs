import { describe, expect, it } from 'vitest';
import {
  applyTextAutoResizeLayoutSizing,
  buildTextResizePatch,
} from '../../src/layout/textAutoResizeLayout.js';
import type { TextNode } from '../../src/model/types.js';

function text(partial: Partial<TextNode>): TextNode {
  return {
    type: 'TEXT',
    id: 'I1',
    name: 'T',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    characters: '',
    ...partial,
  };
}

describe('textAutoResizeLayout', () => {
  it('HEIGHT resize fixes width and hugs vertical', () => {
    const patch = buildTextResizePatch(text({ textAutoResize: 'HEIGHT' }), 236, 18);
    expect(patch).toEqual({
      width: 236,
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'HUG',
    });
    expect(patch.height).toBeUndefined();
  });

  it('HEIGHT resize preserves FILL horizontal', () => {
    const patch = buildTextResizePatch(
      text({ textAutoResize: 'HEIGHT', layoutSizingHorizontal: 'FILL' }),
      236,
      18
    );
    expect(patch.layoutSizingHorizontal).toBe('FILL');
    expect(patch.layoutSizingVertical).toBe('HUG');
  });

  it('WIDTH_AND_HEIGHT resize hugs both axes', () => {
    const patch = buildTextResizePatch(text({ textAutoResize: 'WIDTH_AND_HEIGHT' }), 100, 40);
    expect(patch).toEqual({
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
    });
  });

  it('NONE resize fixes both axes', () => {
    const patch = buildTextResizePatch(text({ textAutoResize: 'NONE' }), 120, 32);
    expect(patch).toEqual({
      width: 120,
      height: 32,
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'FIXED',
    });
  });

  it('applyTextAutoResizeLayoutSizing maps HEIGHT to FIXED×HUG when width set', () => {
    const t = text({ textAutoResize: 'HEIGHT', width: 200 });
    applyTextAutoResizeLayoutSizing(t);
    expect(t.layoutSizingHorizontal).toBe('FIXED');
    expect(t.layoutSizingVertical).toBe('HUG');
  });
});
