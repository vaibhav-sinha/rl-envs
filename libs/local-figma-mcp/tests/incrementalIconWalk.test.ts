import { describe, expect, it } from 'vitest';
import {
  findStructuralIconExportRootIds,
  type SerializedNode,
} from '../plugin/src/tools/iconDetector.js';
import { IncrementalIconWalk } from '../plugin/src/tools/incrementalIconWalk.js';
import type { SerializedNodeWire } from '../plugin/src/streamProtocol.js';

function wireFrom(node: SerializedNode): SerializedNodeWire {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    properties: node.properties,
  };
}

function walkIncremental(root: SerializedNode): IncrementalIconWalk {
  const walk = new IncrementalIconWalk();
  const dfs = (node: SerializedNode, parentId: string | null): void => {
    walk.onTreeEnter(wireFrom(node), parentId);
    for (const ch of node.children ?? []) dfs(ch, node.id);
    walk.onTreeExit();
  };
  dfs(root, null);
  return walk;
}

describe('IncrementalIconWalk', () => {
  const iconFrame: SerializedNode = {
    id: '1:10',
    type: 'FRAME',
    name: 'Icon',
    properties: { width: 24, height: 24 },
    children: [
      {
        id: '1:11',
        type: 'VECTOR',
        name: 'Path',
        properties: {},
      },
    ],
  };

  const document: SerializedNode = {
    id: '0:0',
    type: 'DOCUMENT',
    name: 'Document',
    properties: {},
    children: [
      {
        id: '1:1',
        type: 'PAGE',
        name: 'Page',
        properties: {},
        children: [iconFrame],
      },
    ],
  };

  it('matches findStructuralIconExportRootIds for a simple icon frame', () => {
    const expected = findStructuralIconExportRootIds(document);
    const walk = walkIncremental(document);
    expect(walk.finishIconRootIds()).toEqual(expected);
  });

  it('filters nested icon candidates', () => {
    const nested: SerializedNode = {
      id: '0:0',
      type: 'DOCUMENT',
      name: 'Document',
      properties: {},
      children: [
        {
          id: '1:1',
          type: 'FRAME',
          name: 'Outer',
          properties: { width: 24, height: 24 },
          children: [
            {
              id: '1:2',
              type: 'FRAME',
              name: 'Inner',
              properties: { width: 24, height: 24 },
              children: [
                {
                  id: '1:3',
                  type: 'VECTOR',
                  name: 'V',
                  properties: {},
                },
              ],
            },
          ],
        },
      ],
    };
    const expected = findStructuralIconExportRootIds(nested);
    const walk = walkIncremental(nested);
    expect(walk.finishIconRootIds()).toEqual(expected);
    expect(expected.length).toBeLessThanOrEqual(1);
  });
});
