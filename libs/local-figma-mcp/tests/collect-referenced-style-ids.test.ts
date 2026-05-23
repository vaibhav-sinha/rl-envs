import { describe, expect, it } from 'vitest';
import { collectReferencedStyleIds } from '../plugin/src/tools/exportFile.js';

describe('collectReferencedStyleIds', () => {
  it('gathers fill, stroke, text, effect, and grid style ids from the tree', () => {
    const root = {
      type: 'PAGE',
      fillStyleId: 'S:fill1',
      children: [
        {
          type: 'FRAME',
          strokeStyleId: 'S:stroke1',
          effectStyleId: 'S:effect1',
          gridStyleId: 'S:grid1',
          children: [
            {
              type: 'TEXT',
              textStyleId: 'S:text1',
              children: [],
            },
          ],
        },
      ],
    } as unknown as PageNode;

    const refs = collectReferencedStyleIds(root);
    expect([...refs.paint]).toEqual(['S:fill1', 'S:stroke1']);
    expect([...refs.text]).toEqual(['S:text1']);
    expect([...refs.effect]).toEqual(['S:effect1']);
    expect([...refs.grid]).toEqual(['S:grid1']);
  });

  it('ignores empty style ids', () => {
    const root = {
      type: 'FRAME',
      fillStyleId: '',
      strokeStyleId: 'S:stroke1',
      children: [],
    } as unknown as FrameNode;

    const refs = collectReferencedStyleIds(root);
    expect([...refs.paint]).toEqual(['S:stroke1']);
  });
});
