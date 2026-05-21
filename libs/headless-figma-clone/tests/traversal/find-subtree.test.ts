import { describe, expect, it } from 'vitest';
import { findSubtreeNodes } from '../../src/traversal/findNodes.js';
import type { FrameNode, PageNode } from '../../src/model/types.js';

describe('findSubtreeNodes', () => {
  it('includes root and descendants in pre-order', () => {
    const page: PageNode = {
      id: 'P1',
      type: 'PAGE',
      name: 'Page',
      children: [],
    };
    const frame: FrameNode = {
      id: 'F1',
      type: 'FRAME',
      name: 'Root',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [
        {
          id: 'R1',
          type: 'RECTANGLE',
          name: 'A',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
        },
        {
          id: 'F2',
          type: 'FRAME',
          name: 'Inner',
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          children: [
            {
              id: 'R2',
              type: 'RECTANGLE',
              name: 'B',
              x: 0,
              y: 0,
              width: 10,
              height: 10,
            },
          ],
        },
      ],
    };
    page.children = [frame];
    const working = {
      schema_version: 1 as const,
      document: { id: 'D1', type: 'DOCUMENT' as const, name: 'Doc', children: [page] },
    };

    const names = findSubtreeNodes(frame, working, { types: ['RECTANGLE'] }).map((n) => n.name);
    expect(names).toEqual(['A', 'B']);
  });
});
