import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { NodeIndex } from '../engine/nodeIndex.js';
import type { AnyTreeNode, FileEnvelope } from '../model/types.js';
import {
  findSubtreeNodes,
  nodeMatches as nodeMatchesCriteria,
  nodeSupportsTraversal,
  parseFindCriteria,
  type FindCriteria,
} from '../traversal/findNodes.js';
import { throwIfAborted } from './inFlightAbort.js';
import { ScriptQueryResult, type ScriptQueryDeps } from './scriptQuery.js';
import { queryDescendants, nodeMatches as nodeMatchesSelector, type QueryContext } from '../traversal/nodeQuery.js';
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
  /** Present on detached `INSTANCE` — used when pending children are empty. */
  readonly mainComponentId?: string;
}

export interface DetachedTraversalContext {
  working: FileEnvelope;
  deletedIds: Set<string>;
  createHandle: (nodeId: string) => unknown;
  /** When traversing a detached INSTANCE with no pending children, route master hits to instance overrides. */
  createInstanceMasterHandle?: (owner: DetachedTraversalContainer, masterNodeId: string) => unknown;
  wrapRuntime: (node: DetachedTraversalContainer) => unknown;
  signal?: AbortSignal;
  nodeIndex?: NodeIndex;
}

function createSubtreeHandle(
  ctx: DetachedTraversalContext,
  instanceOwner: DetachedTraversalContainer | undefined,
  nodeId: string
): unknown {
  const live = findEnvelopeNode(ctx.working, nodeId, ctx.nodeIndex);
  if (live?.type === 'INSTANCE') {
    return ctx.createHandle(nodeId);
  }
  if (instanceOwner?.type === 'INSTANCE' && ctx.createInstanceMasterHandle) {
    return ctx.createInstanceMasterHandle(instanceOwner, nodeId);
  }
  return ctx.createHandle(nodeId);
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
  return type !== 'PAGE' && type !== 'DOCUMENT' && nodeSupportsTraversal(type);
}

function resolveMainComponentRootChildIds(
  working: FileEnvelope,
  mainComponentId: string,
  nodeIndex?: NodeIndex
): string[] {
  const main = findEnvelopeNode(working, mainComponentId, nodeIndex);
  if (!main) return [];
  let compId: string | null = null;
  if (main.type === 'COMPONENT') compId = main.id;
  else if (main.type === 'COMPONENT_SET') compId = main.componentIds[0] ?? null;
  if (!compId) return [];
  const comp = findEnvelopeNode(working, compId, nodeIndex);
  if (!comp || comp.type !== 'COMPONENT') return [];
  const frame = findEnvelopeNode(working, comp.rootFrameId, nodeIndex);
  if (frame?.type !== 'FRAME') return [];
  return frame.children.map((c) => c.id);
}

function walkDetachedInstanceMainComponentRoots(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>,
  out: unknown[]
): void {
  const mid = container.mainComponentId;
  if (!mid) return;
  for (const rootId of resolveMainComponentRootChildIds(ctx.working, mid, ctx.nodeIndex)) {
    walkDocumentPendingSubtree(rootId, ctx, parsed, out, container);
  }
}

function runtimeMatchesCriteria(node: DetachedTraversalContainer, criteria: FindCriteria): boolean {
  return nodeMatchesCriteria(
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
  return nodeMatchesCriteria(live, parsed.criteria);
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
  out: unknown[],
  instanceOwner?: DetachedTraversalContainer
): void {
  throwIfAborted(ctx.signal);
  if (ctx.deletedIds.has(nodeId)) return;
  const live = findEnvelopeNode(ctx.working, nodeId, ctx.nodeIndex);
  if (!live) return;

  const docPred =
    parsed.mode === 'predicate'
      ? (n: AnyTreeNode) => parsed.fn(createSubtreeHandle(ctx, instanceOwner, n.id))
      : undefined;
  const hits = findSubtreeNodes(live, ctx.working, parsed.mode === 'criteria' ? parsed.criteria : {}, docPred, {
    signal: ctx.signal,
    nodeIndex: ctx.nodeIndex,
  });
  for (const n of hits) {
    if (!ctx.deletedIds.has(n.id)) out.push(createSubtreeHandle(ctx, instanceOwner, n.id));
  }
}

function walkDetachedFindAllRoots(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  parsed: ReturnType<typeof parseCallbackOrCriteria>
): unknown[] {
  const out: unknown[] = [];
  const pending = container.getPendingChildEntries();
  if (pending.length === 0 && container.type === 'INSTANCE') {
    walkDetachedInstanceMainComponentRoots(container, ctx, parsed, out);
    return out;
  }
  for (const entry of pending) {
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
  const pending = container.getPendingChildEntries();
  if (pending.length === 0 && container.type === 'INSTANCE') {
    const mid = container.mainComponentId;
    if (!mid) return out;
    for (const rootId of resolveMainComponentRootChildIds(ctx.working, mid, ctx.nodeIndex)) {
      if (ctx.deletedIds.has(rootId)) continue;
      const live = findEnvelopeNode(ctx.working, rootId, ctx.nodeIndex);
      if (!live) continue;
      if (matchesDocumentNode(live, ctx, parsed)) {
        out.push(createSubtreeHandle(ctx, container, live.id));
      }
    }
    return out;
  }
  for (const entry of pending) {
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

function detachedScriptQueryDeps(ctx: DetachedTraversalContext): ScriptQueryDeps {
  return {
    working: ctx.working,
    deletedIds: ctx.deletedIds,
    nodeIndex: ctx.nodeIndex,
    createHandle: ctx.createHandle,
    queueUpdate: () => {
      throw new ValidationErr('VALIDATION_ERROR', 'query requires write context');
    },
    signal: ctx.signal,
  };
}

function detachedNodeQueryStub(container: DetachedTraversalContainer): AnyTreeNode {
  const stub: Record<string, unknown> = {
    type: container.type,
    name: container.name,
    visible: container.visible ?? true,
  };
  const ext = container as unknown as Record<string, unknown>;
  if (Array.isArray(ext.fills)) stub.fills = ext.fills;
  if (typeof ext.layoutMode === 'string') stub.layoutMode = ext.layoutMode;
  return stub as unknown as AnyTreeNode;
}

function collectRuntimeDetachedQueryIds(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  selector: string,
  qctx: QueryContext
): string[] {
  const out: string[] = [];
  const walk = (node: DetachedTraversalContainer): void => {
    if (nodeMatchesSelector(detachedNodeQueryStub(node), selector, qctx)) {
      const nid = node.getAttachedIdOrNull();
      if (nid && !ctx.deletedIds.has(nid)) out.push(nid);
    }
    for (const entry of node.getPendingChildEntries()) {
      const { child } = entry;
      if (isRuntimeSceneNode(child) && !child.attached) walk(child);
    }
  };
  if (!container.attached) walk(container);
  return out;
}

function collectDetachedQueryIds(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext,
  selector: string
): string[] {
  const qctx: QueryContext = {
    working: ctx.working,
    nodeIndex: ctx.nodeIndex,
    signal: ctx.signal,
  };
  const merged: string[] = [];
  const walkFromLive = (live: AnyTreeNode): void => {
    for (const hit of queryDescendants(live, selector, qctx)) {
      if (!ctx.deletedIds.has(hit.id)) merged.push(hit.id);
    }
  };
  if (container.type === 'INSTANCE' && container.mainComponentId) {
    const main = findEnvelopeNode(ctx.working, container.mainComponentId, ctx.nodeIndex);
    if (main?.type === 'COMPONENT') {
      const frame = findEnvelopeNode(ctx.working, main.rootFrameId, ctx.nodeIndex);
      if (frame) walkFromLive(frame);
    } else if (main?.type === 'COMPONENT_SET') {
      const cid = main.componentIds[0];
      if (cid) {
        const comp = findEnvelopeNode(ctx.working, cid, ctx.nodeIndex);
        if (comp?.type === 'COMPONENT') {
          const frame = findEnvelopeNode(ctx.working, comp.rootFrameId, ctx.nodeIndex);
          if (frame) walkFromLive(frame);
        }
      }
    }
  }
  for (const entry of container.getPendingChildEntries()) {
    const id = readChildId(entry.child);
    if (!id) continue;
    const live = findEnvelopeNode(ctx.working, id, ctx.nodeIndex);
    if (live) walkFromLive(live);
  }
  for (const id of collectRuntimeDetachedQueryIds(container, ctx, selector, qctx)) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

export function getDetachedImmediateChildren(
  container: DetachedTraversalContainer,
  ctx: DetachedTraversalContext
): unknown[] {
  if (!runtimeSupportsDetachedTraversal(container.type)) return [];
  const pending = container.getPendingChildEntries();
  if (pending.length === 0 && container.type === 'INSTANCE') {
    const mid = container.mainComponentId;
    if (!mid) return [];
    return resolveMainComponentRootChildIds(ctx.working, mid, ctx.nodeIndex)
      .filter((id) => !ctx.deletedIds.has(id))
      .map((id) => createSubtreeHandle(ctx, container, id));
  }
  return pending
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

    query(selector: unknown): ScriptQueryResult {
      assertDetachedTraversalContainer(container);
      if (typeof selector !== 'string') {
        throw new ValidationErr('VALIDATION_ERROR', 'query requires a selector string');
      }
      return new ScriptQueryResult(detachedScriptQueryDeps(ctx), collectDetachedQueryIds(container, ctx, selector));
    },

    matches(selector: unknown): boolean {
      assertDetachedTraversalContainer(container);
      if (typeof selector !== 'string') {
        throw new ValidationErr('VALIDATION_ERROR', 'matches requires a selector string');
      }
      const qctx: QueryContext = {
        working: ctx.working,
        nodeIndex: ctx.nodeIndex,
        signal: ctx.signal,
      };
      return nodeMatchesSelector(detachedNodeQueryStub(container), selector, qctx);
    },
  };
}
