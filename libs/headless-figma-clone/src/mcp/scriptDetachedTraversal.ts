import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { NodeIndex } from '../engine/nodeIndex.js';
import type { AnyTreeNode, FileEnvelope } from '../model/types.js';
import {
  findSubtreeNodes,
  nodeMatches,
  parseFindCriteria,
  type FindCriteria,
} from '../traversal/findNodes.js';
import { throwIfAborted } from './inFlightAbort.js';
import { ValidationErr } from '../util/errors.js';

export interface PendingChildEntry {
  child: unknown;
  index?: number;
}

/** Runtime node surface used for detached subtree traversal. */
export interface DetachedTraversalContainer {
  readonly type: string;
  readonly name: string;
  readonly visible?: boolean;
  readonly attached: boolean;
  getAttachedIdOrNull(): string | null;
  getPendingChildEntries(): ReadonlyArray<PendingChildEntry>;
}

export interface DetachedTraversalContext {
  working: FileEnvelope;
  deletedIds: Set<string>;
  createHandle: (nodeId: string) => unknown;
  wrapRuntime: (node: DetachedTraversalContainer) => unknown;
  signal?: AbortSignal;
  nodeIndex?: NodeIndex;
}

function isRuntimeSceneNode(v: unknown): v is DetachedTraversalContainer {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as DetachedTraversalContainer).getAttachedIdOrNull === 'function' &&
    typeof (v as DetachedTraversalContainer).getPendingChildEntries === 'function'
  );
}

function readChildId(child: unknown): string | null {
  if (isRuntimeSceneNode(child)) {
    const nid = child.getAttachedIdOrNull();
    return nid;
  }
  if (typeof child === 'object' && child !== null && 'id' in child && typeof (child as { id: unknown }).id === 'string') {
    return (child as { id: string }).id;
  }
  return null;
}

export function runtimeSupportsDetachedTraversal(type: string): boolean {
  return type === 'FRAME' || type === 'TRANSFORM_GROUP';
}

function runtimeMatchesCriteria(node: DetachedTraversalContainer, criteria: FindCriteria): boolean {
  return nodeMatches(
    { type: node.type, name: node.name, visible: node.visible } as AnyTreeNode,
    criteria
  );
}

function resolvePendingChildHandle(ctx: DetachedTraversalContext, entry: PendingChildEntry): unknown | null {
  const { child } = entry;
  if (isRuntimeSceneNode(child)) {
    if (!child.attached) return ctx.wrapRuntime(child);
    const nid = child.getAttachedIdOrNull();
    if (!nid || ctx.deletedIds.has(nid)) return null;
    return ctx.createHandle(nid);
  }
  const id = readChildId(child);
  if (!id || ctx.deletedIds.has(id)) return null;
  return ctx.createHandle(id);
}

function assertDetachedTraversalContainer(container: DetachedTraversalContainer): void {
  if (!runtimeSupportsDetachedTraversal(container.type)) {
    throw new ValidationErr('UNSUPPORTED_OPERATION', `Traversal not supported on ${container.type}`);
  }
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

function matchesDetachedRuntime(
  node: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>
): boolean {
  const handle = ctx.wrapRuntime(node);
  if (parsed.mode === 'predicate') return parsed.fn(handle);
  return runtimeMatchesCriteria(node, parsed.criteria);
}

function matchesDocumentNode(
  live: AnyTreeNode,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>
): boolean {
  const handle = ctx.createHandle(live.id);
  if (parsed.mode === 'predicate') return parsed.fn(handle);
  return nodeMatches(live, parsed.criteria);
}

function walkDetachedRuntimePreorder(
  node: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>,
  out: unknown[]
): void {
  throwIfAborted(ctx.signal);
  if (matchesDetachedRuntime(node, ctx, parsed)) out.push(ctx.wrapRuntime(node));

  if (!runtimeSupportsDetachedTraversal(node.type)) return;

  for (const entry of node.getPendingChildEntries()) {
    const { child } = entry;
    if (isRuntimeSceneNode(child) && !child.attached) {
      walkDetachedRuntimePreorder(child, ctx, parsed, out);
      continue;
    }
    const id = readChildId(child);
    if (!id) continue;
    walkDocumentPendingSubtree(id, ctx, parsed, out);
  }
}

function walkDocumentPendingSubtree(
  nodeId: string,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>,
  out: unknown[]
): void {
  throwIfAborted(ctx.signal);
  if (ctx.deletedIds.has(nodeId)) return;
  const live = findEnvelopeNode(ctx.working, nodeId, ctx.nodeIndex);
  if (!live) return;

  const docPred =
    parsed.mode === 'predicate'
      ? (n: AnyTreeNode) => parsed.fn(ctx.createHandle(n.id))
      : undefined;
  const hits = findSubtreeNodes(live, ctx.working, parsed.mode === 'criteria' ? parsed.criteria : {}, docPred, {
    signal: ctx.signal,
    nodeIndex: ctx.nodeIndex,
  });
  for (const n of hits) {
    if (!ctx.deletedIds.has(n.id)) out.push(ctx.createHandle(n.id));
  }
}

function walkDetachedFindAllRoots(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>
): unknown[] {
  const out: unknown[] = [];
  for (const entry of container.getPendingChildEntries()) {
    const { child } = entry;
    if (isRuntimeSceneNode(child) && !child.attached) {
      walkDetachedRuntimePreorder(child, ctx, parsed, out);
      continue;
    }
    const id = readChildId(child);
    if (id) walkDocumentPendingSubtree(id, ctx, parsed, out);
  }
  return out;
}

function filterDetachedImmediateChildren(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>
): unknown[] {
  const out: unknown[] = [];
  for (const entry of container.getPendingChildEntries()) {
    const { child } = entry;
    if (isRuntimeSceneNode(child) && !child.attached) {
      if (matchesDetachedRuntime(child, ctx, parsed)) out.push(ctx.wrapRuntime(child));
      continue;
    }
    const id = readChildId(child);
    if (!id || ctx.deletedIds.has(id)) continue;
    const live = findEnvelopeNode(ctx.working, id, ctx.nodeIndex);
    if (!live) continue;
    if (matchesDocumentNode(live, ctx, parsed)) out.push(ctx.createHandle(live.id));
  }
  return out;
}

export function getDetachedImmediateChildren(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext
): unknown[] {
  if (!runtimeSupportsDetachedTraversal(container.type)) return [];
  return container.getPendingChildEntries()
    .map((entry) => resolvePendingChildHandle(ctx, entry))
    .filter((h): h is unknown => h !== null);
}

export function createDetachedTraversalMethods(
  ctx: DetachedTraversalContext,
  container: DetachedTraversalContainer
) {
  return {
    findAll(callback?: unknown): unknown[] {
      assertDetachedTraversalContainer(container);
      const parsed = parseCallbackOrCriteria(callback);
      return walkDetachedFindAllRoots(container, ctx, parsed);
    },

    findOne(callback: unknown): unknown | null {
      assertDetachedTraversalContainer(container);
      if (typeof callback !== 'function') {
        throw new ValidationErr('VALIDATION_ERROR', 'findOne requires a callback function');
      }
      const parsed = parseCallbackOrCriteria(callback);
      const hits = walkDetachedFindAllRoots(container, ctx, parsed);
      return hits[0] ?? null;
    },

    findChildren(callback?: unknown): unknown[] {
      assertDetachedTraversalContainer(container);
      const parsed = parseCallbackOrCriteria(callback);
      return filterDetachedImmediateChildren(container, ctx, parsed);
    },

    findChild(callback: unknown): unknown | null {
      return createDetachedTraversalMethods(ctx, container).findChildren(callback)[0] ?? null;
    },

    findAllWithCriteria(criteria: unknown): unknown[] {
      assertDetachedTraversalContainer(container);
      const parsed = parseCallbackOrCriteria(criteria);
      if (parsed.mode !== 'criteria') {
        throw new ValidationErr('VALIDATION_ERROR', 'findAllWithCriteria requires a criteria object');
      }
      return walkDetachedFindAllRoots(container, ctx, parsed);
    },
  };
}
