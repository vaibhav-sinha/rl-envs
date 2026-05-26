import type { PageNode } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import { runNodeMatches, runNodeQuery, type ScriptQueryDeps, type ScriptQueryResult } from './scriptQuery.js';
import { createTraversalMethods, type ScriptTraversalContext } from './scriptTraversal.js';
import { nodeMatches, parseFindCriteria } from '../traversal/findNodes.js';

function unionIndexedComponentSetHits(
  ctx: ScriptTraversalContext,
  criteria: ReturnType<typeof parseFindCriteria>,
  hits: unknown[]
): unknown[] {
  if (!criteria.types?.includes('COMPONENT_SET') || !ctx.graphIndexes) return hits;
  const seen = new Set<string>();
  for (const hit of hits) {
    const id = (hit as { id?: string }).id;
    if (id) seen.add(id);
  }
  const out = [...hits];
  for (const node of ctx.graphIndexes.nodes.values()) {
    if (node.type !== 'COMPONENT_SET') continue;
    if (!nodeMatches(node, criteria)) continue;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(ctx.createHandle(node.id));
  }
  return out;
}

function queryDeps(ctx: ScriptTraversalContext): ScriptQueryDeps {
  if (!ctx.queueUpdate) {
    throw new ValidationErr('VALIDATION_ERROR', 'query requires write context');
  }
  return {
    working: ctx.working,
    deletedIds: ctx.deletedIds,
    nodeIndex: ctx.nodeIndex,
    graphIndexes: ctx.graphIndexes,
    signal: ctx.signal,
    createHandle: ctx.createHandle,
    queueUpdate: ctx.queueUpdate,
  };
}

export function createDocumentTraversalMethods(
  makeTraversalCtx: () => ScriptTraversalContext
): ReturnType<typeof createTraversalMethods> {
  return {
    findAll(callback?: unknown): unknown[] {
      const ctx = makeTraversalCtx();
      const out: unknown[] = [];
      for (const page of ctx.working.document.children) {
        if (page.type !== 'PAGE') continue;
        out.push(...createTraversalMethods(ctx, page.id).findAll(callback));
      }
      if (callback !== undefined && callback !== null && typeof callback !== 'function') {
        return unionIndexedComponentSetHits(ctx, parseFindCriteria(callback), out);
      }
      return out;
    },

    findOne(callback: unknown): unknown | null {
      const ctx = makeTraversalCtx();
      for (const page of ctx.working.document.children) {
        if (page.type !== 'PAGE') continue;
        const hit = createTraversalMethods(ctx, page.id).findOne(callback);
        if (hit) return hit;
      }
      return null;
    },

    findChildren(callback?: unknown): unknown[] {
      const ctx = makeTraversalCtx();
      return ctx.working.document.children
        .filter((c): c is PageNode => c.type === 'PAGE')
        .flatMap((p) => createTraversalMethods(ctx, p.id).findChildren(callback));
    },

    findChild(callback: unknown): unknown | null {
      const hits = createDocumentTraversalMethods(makeTraversalCtx).findChildren(callback);
      return hits[0] ?? null;
    },

    findAllWithCriteria(criteria: unknown): unknown[] {
      const ctx = makeTraversalCtx();
      const parsed = parseFindCriteria(criteria);
      const out: unknown[] = [];
      for (const page of ctx.working.document.children) {
        if (page.type !== 'PAGE') continue;
        out.push(...createTraversalMethods(ctx, page.id).findAllWithCriteria(criteria));
      }
      return unionIndexedComponentSetHits(ctx, parsed, out);
    },

    query(selector: unknown): ScriptQueryResult {
      if (typeof selector !== 'string') {
        throw new ValidationErr('VALIDATION_ERROR', 'query requires a selector string');
      }
      const ctx = makeTraversalCtx();
      return runNodeQuery(queryDeps(ctx), ctx.working.document, selector);
    },

    matches(selector: unknown): boolean {
      if (typeof selector !== 'string') {
        throw new ValidationErr('VALIDATION_ERROR', 'matches requires a selector string');
      }
      const ctx = makeTraversalCtx();
      return runNodeMatches(queryDeps(ctx), ctx.working.document, selector);
    },
  };
}
