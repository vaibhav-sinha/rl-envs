import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { findAllNodes, findOneNode, parseFindCriteria } from '../../src/traversal/findNodes.js';
import { ValidationErr } from '../../src/util/errors.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('findNodes traversal', () => {
  it('parseFindCriteria validates shape', () => {
    expect(parseFindCriteria(undefined)).toEqual({});
    expect(() => parseFindCriteria('bad')).toThrow(ValidationErr);
    expect(() => parseFindCriteria({ types: [1] })).toThrow(/types must be string array/);
    expect(() => parseFindCriteria({ name: 'x', nameMatch: 'fuzzy' })).toThrow(/exact or contains/);
  });

  it('findAllNodes filters by type and name contains', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'Primary Button', x: 0, y: 0, width: 10, height: 10 },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'ELLIPSE', name: 'Avatar', x: 0, y: 0, width: 20, height: 20 },
    });
    const page = env.document.children[0]!;
    const rects = findAllNodes(page, { types: ['RECTANGLE'] });
    expect(rects).toHaveLength(1);
    expect(rects[0]?.name).toBe('Primary Button');

    const byName = findAllNodes(page, { name: 'button', nameMatch: 'contains' });
    expect(byName).toHaveLength(1);

    const exact = findAllNodes(page, { name: 'Avatar', nameMatch: 'exact' });
    expect(exact).toHaveLength(1);
  });

  it('findAllNodes filters visible flag', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const visibleId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'On', x: 0, y: 0, width: 10, height: 10, visible: true },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'Off', x: 0, y: 0, width: 10, height: 10, visible: false },
    });
    const page = env.document.children[0]!;
    const vis = findAllNodes(page, { types: ['RECTANGLE'], visible: true });
    expect(vis.map((n) => n.id)).toEqual([visibleId]);
  });

  it('findOneNode returns first DFS match', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'Shell', x: 0, y: 0, width: 100, height: 100, children: [] },
    });
    const innerId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: frameId,
      node: { type: 'RECTANGLE', name: 'Inner', x: 0, y: 0, width: 5, height: 5 },
    });
    const page = env.document.children[0]!;
    const hit = findOneNode(page, { types: ['RECTANGLE'] });
    expect(hit?.id).toBe(innerId);
  });
});
