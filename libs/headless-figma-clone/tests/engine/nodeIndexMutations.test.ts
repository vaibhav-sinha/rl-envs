import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, applyEngineOp, detachInstanceInEnvelope, duplicateNodeInEnvelope } from '../../src/engine/DocumentEngine.js';
import { buildGraphIndexes, resolveParentNode } from '../../src/engine/nodeIndex.js';
import { applyIndexAfterDeleteOp, applyIndexForEngineOp, collectDeleteUnindexIdsForOp } from '../../src/engine/nodeIndexMutations.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('nodeIndexMutations', () => {
  it('incremental index stays consistent after create, duplicate, move, delete', () => {
    const env = emptyEnvelope(100);
    const pid = pageId(env);
    const graph = buildGraphIndexes(env);
    const ctx = { indexes: graph };

    const frameId = applyCreateNodeOp(
      env,
      {
        op: 'createNode',
        parentId: pid,
        node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 100, height: 100, children: [] },
      },
      ctx
    );
    applyIndexForEngineOp(graph, env, { op: 'createNode', parentId: pid, node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 100, height: 100, children: [] } }, frameId);

    const rectId = applyCreateNodeOp(
      env,
      {
        op: 'createNode',
        parentId: frameId,
        node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 10, height: 10 },
      },
      ctx
    );
    applyIndexForEngineOp(
      graph,
      env,
      {
        op: 'createNode',
        parentId: frameId,
        node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 10, height: 10 },
      },
      rectId
    );

    const cloneId = duplicateNodeInEnvelope(env, rectId, ctx);
    applyIndexForEngineOp(graph, env, { op: 'duplicateNode', nodeId: rectId }, cloneId);

    applyEngineOp(env, { op: 'moveNode', nodeId: cloneId, newParentId: pid }, ctx);
    applyIndexForEngineOp(graph, env, { op: 'moveNode', nodeId: cloneId, newParentId: pid }, undefined);

    expect(resolveParentNode(graph, cloneId)?.id).toBe(pid);
    expect(graph.nodes.get(cloneId)?.name).toBe('R');

    const deleteOp = { op: 'deleteNode' as const, nodeId: rectId };
    const deleteIds = collectDeleteUnindexIdsForOp(env, deleteOp);
    applyEngineOp(env, deleteOp, ctx);
    applyIndexAfterDeleteOp(graph, deleteIds);
    expect(graph.nodes.has(rectId)).toBe(false);
  });

  it('detachInstance replaces INSTANCE with FRAME in incremental index', () => {
    const env = emptyEnvelope(100);
    const instId = 'I50';
    env.document.children[0]!.children.push({
      id: instId,
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      mainComponentId: 'I_missing',
      children: [
        {
          id: 'I51',
          type: 'RECTANGLE',
          name: 'Child',
          x: 0,
          y: 0,
          width: 8,
          height: 8,
        },
      ],
    });

    const graph = buildGraphIndexes(env);
    const ctx = { indexes: graph };
    expect(graph.nodes.get(instId)?.type).toBe('INSTANCE');

    detachInstanceInEnvelope(env, instId, ctx);
    applyIndexForEngineOp(graph, env, { op: 'detachInstance', nodeId: instId }, instId);

    expect(graph.nodes.get(instId)?.type).toBe('FRAME');

    const rectId = applyCreateNodeOp(
      env,
      {
        op: 'createNode',
        parentId: instId,
        node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 8, height: 8 },
      },
      ctx
    );
    expect(rectId).toBeTruthy();
    expect(graph.nodes.get(instId)?.type).toBe('FRAME');
  });
});
