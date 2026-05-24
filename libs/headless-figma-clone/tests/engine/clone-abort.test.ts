import { describe, expect, it } from 'vitest';
import {
  applyCreateNodeOp,
  cloneSceneSubtreeWithNewIds,
  duplicateNodeInEnvelope,
} from '../../src/engine/DocumentEngine.js';
import type { FrameNode } from '../../src/model/types.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('clone abort', () => {
  it('cloneSceneSubtreeWithNewIds throws when signal is already aborted', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    let parentId = pid;
    for (let i = 0; i < 6; i++) {
      parentId = applyCreateNodeOp(env, {
        op: 'createNode',
        parentId,
        node: {
          type: 'FRAME',
          name: `F${String(i)}`,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          children: [],
        },
      });
    }
    const top = env.document.children[0]!.children[0] as FrameNode;
    const ac = new AbortController();
    ac.abort(new Error('aborted clone'));
    expect(() => cloneSceneSubtreeWithNewIds(env, top, ac.signal)).toThrow(/aborted clone/);
  });

  it('duplicateNodeInEnvelope respects abort signal', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const rectId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 4, height: 4 },
    });
    const ac = new AbortController();
    ac.abort(new Error('dup abort'));
    expect(() => duplicateNodeInEnvelope(env, rectId, { signal: ac.signal })).toThrow(/dup abort/);
  });
});
