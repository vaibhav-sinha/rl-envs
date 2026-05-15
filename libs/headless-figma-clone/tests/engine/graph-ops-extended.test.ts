import { describe, expect, it } from 'vitest';
import type { EngineOperation } from '../../src/engine/DocumentEngine.js';
import { applyCreateNodeOp } from '../../src/engine/DocumentEngine.js';
import { queueFlattenNodes, queueGroupNodes } from '../../src/engine/graphOps.js';
import { ValidationErr } from '../../src/util/errors.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('graphOps extended', () => {
  it('queueGroupNodes rejects empty selection', () => {
    const env = emptyEnvelope();
    const ops: EngineOperation[] = [];
    expect(() => queueGroupNodes(env, ops, [], { id: pageId(env) })).toThrow(/at least one node/);
  });

  it('queueFlattenNodes merges ellipse into VECTOR path', () => {
    const env = emptyEnvelope();
    const ops: EngineOperation[] = [];
    const pid = pageId(env);
    const ellId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'ELLIPSE', name: 'E', x: 10, y: 10, width: 40, height: 30 },
    });
    const vecId = queueFlattenNodes(env, ops, [ellId], { id: pid });
    const vec = env.document.children[0]!.children.find((c) => c.id === vecId);
    expect(vec?.type).toBe('VECTOR');
    if (vec?.type === 'VECTOR') {
      expect(vec.vectorPaths?.[0]?.data).toMatch(/A/);
    }
    expect(env.document.children[0]!.children.some((c) => c.id === ellId)).toBe(false);
  });

  it('queueGroupNodes throws for unknown node id', () => {
    const env = emptyEnvelope();
    const ops: EngineOperation[] = [];
    expect(() => queueGroupNodes(env, ops, ['I999'], { id: pageId(env) })).toThrow(ValidationErr);
  });
});
