import type { PageNode } from '../model/types.js';
import { createTraversalMethods, type ScriptTraversalContext } from './scriptTraversal.js';

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
      const out: unknown[] = [];
      for (const page of ctx.working.document.children) {
        if (page.type !== 'PAGE') continue;
        out.push(...createTraversalMethods(ctx, page.id).findAllWithCriteria(criteria));
      }
      return out;
    },
  };
}
