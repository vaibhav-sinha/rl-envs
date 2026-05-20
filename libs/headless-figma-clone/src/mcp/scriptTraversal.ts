import type { FileEnvelope } from '../model/types.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { NodeIndex } from '../engine/nodeIndex.js';
import {
  findAllDescendants,
  findImmediateChildren,
  findOneDescendant,
  nodeSupportsTraversal,
  parseFindCriteria,
  type FindCriteria,
} from '../traversal/findNodes.js';
import { ValidationErr } from '../util/errors.js';

export type TraversalHandleFactory = (nodeId: string) => unknown;

export interface ScriptTraversalContext {
  working: FileEnvelope;
  deletedIds: Set<string>;
  createHandle: TraversalHandleFactory;
  signal?: AbortSignal;
  nodeIndex?: NodeIndex;
}

function liveContainer(ctx: ScriptTraversalContext, containerId: string) {
  if (ctx.deletedIds.has(containerId)) {
    throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${containerId}`);
  }
  const live = findEnvelopeNode(ctx.working, containerId, ctx.nodeIndex);
  if (!live) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${containerId}`);
  if (!nodeSupportsTraversal(live.type)) {
    throw new ValidationErr('UNSUPPORTED_OPERATION', `Traversal not supported on ${live.type}`);
  }
  return live;
}

function toHandles(ctx: ScriptTraversalContext, nodes: Array<{ id: string }>): unknown[] {
  return nodes
    .filter((n) => !ctx.deletedIds.has(n.id))
    .map((n) => ctx.createHandle(n.id));
}

function parseCallbackOrCriteria(
  arg: unknown
): { mode: 'predicate'; fn: (node: unknown) => boolean } | { mode: 'criteria'; criteria: FindCriteria } {
  if (arg === undefined || arg === null) {
    return { mode: 'criteria', criteria: {} };
  }
  if (typeof arg === 'function') {
    return { mode: 'predicate', fn: arg as (node: unknown) => boolean };
  }
  return { mode: 'criteria', criteria: parseFindCriteria(arg) };
}

export function createTraversalMethods(ctx: ScriptTraversalContext, containerId: string) {
  return {
    findAll(callback?: unknown): unknown[] {
      const live = liveContainer(ctx, containerId);
      const parsed = parseCallbackOrCriteria(callback);
      if (parsed.mode === 'predicate') {
        const pred = (n: { id: string }) => {
          const h = ctx.createHandle(n.id);
          return parsed.fn(h);
        };
        return toHandles(
          ctx,
          findAllDescendants(live, ctx.working, {}, pred, { signal: ctx.signal, nodeIndex: ctx.nodeIndex })
        );
      }
      return toHandles(
        ctx,
        findAllDescendants(live, ctx.working, parsed.criteria, undefined, {
          signal: ctx.signal,
          nodeIndex: ctx.nodeIndex,
        })
      );
    },

    findOne(callback: unknown): unknown | null {
      const live = liveContainer(ctx, containerId);
      if (typeof callback !== 'function') {
        throw new ValidationErr('VALIDATION_ERROR', 'findOne requires a callback function');
      }
      const fn = callback as (node: unknown) => boolean;
      const pred = (n: { id: string }) => fn(ctx.createHandle(n.id));
      const hit = findOneDescendant(live, ctx.working, {}, pred, {
        signal: ctx.signal,
        nodeIndex: ctx.nodeIndex,
      });
      return hit ? ctx.createHandle(hit.id) : null;
    },

    findChildren(callback?: unknown): unknown[] {
      const live = liveContainer(ctx, containerId);
      const parsed = parseCallbackOrCriteria(callback);
      if (parsed.mode === 'predicate') {
        const pred = (n: { id: string }) => parsed.fn(ctx.createHandle(n.id));
        return toHandles(
          ctx,
          findImmediateChildren(live, ctx.working, {}, pred, { signal: ctx.signal, nodeIndex: ctx.nodeIndex })
        );
      }
      return toHandles(
        ctx,
        findImmediateChildren(live, ctx.working, parsed.criteria, undefined, {
          signal: ctx.signal,
          nodeIndex: ctx.nodeIndex,
        })
      );
    },

    findChild(callback: unknown): unknown | null {
      const hits = createTraversalMethods(ctx, containerId).findChildren(callback);
      return hits[0] ?? null;
    },

    findAllWithCriteria(criteria: unknown): unknown[] {
      const live = liveContainer(ctx, containerId);
      return toHandles(
        ctx,
        findAllDescendants(live, ctx.working, parseFindCriteria(criteria), undefined, {
          signal: ctx.signal,
          nodeIndex: ctx.nodeIndex,
        })
      );
    },
  };
}
