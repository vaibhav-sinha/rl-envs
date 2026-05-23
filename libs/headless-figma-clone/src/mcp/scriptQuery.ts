import type { AnyTreeNode, FileEnvelope } from '../model/types.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { NodeIndex } from '../engine/nodeIndex.js';
import { validateAxisSizingMode } from '../engine/axisSizingMode.js';
import { ENGINE_MATRIX } from '../engine/phase-matrix.js';
import { ValidationErr } from '../util/errors.js';
import { nodeMatches, queryDescendants, type QueryContext } from '../traversal/nodeQuery.js';

export interface ScriptQueryDeps {
  working: FileEnvelope;
  deletedIds: Set<string>;
  nodeIndex?: NodeIndex;
  createHandle: (nodeId: string) => unknown;
  queueUpdate: (nodeId: string, patch: Record<string, unknown>) => void;
  signal?: AbortSignal;
  graphIndexes?: import('../engine/nodeIndex.js').GraphIndexes;
}

const SET_PRIORITY_KEYS = ['layoutMode', 'layoutWrap', 'primaryAxisSizingMode', 'counterAxisSizingMode'];

function isPatchKeyForType(nodeType: string, key: string): boolean {
  const m = ENGINE_MATRIX.patchKeysByType as Record<string, Set<string> | undefined>;
  return Boolean(m[nodeType]?.has(key));
}

function orderSetPropEntries(props: Record<string, unknown>): [string, unknown][] {
  const entries = Object.entries(props);
  return [
    ...entries.filter(([k]) => SET_PRIORITY_KEYS.includes(k)),
    ...entries.filter(([k]) => !SET_PRIORITY_KEYS.includes(k)),
  ];
}

function buildSetPropPatch(nodeType: string, props: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [key, value] of orderSetPropEntries(props)) {
    if (key === 'width' || key === 'height') continue;
    if (!isPatchKeyForType(nodeType, key)) {
      throw new ValidationErr('UNSUPPORTED_PROPERTY', `Unsupported patch key: ${key}`);
    }
    if (key === 'primaryAxisSizingMode' || key === 'counterAxisSizingMode') {
      patch[key] = validateAxisSizingMode(value, key);
      continue;
    }
    patch[key] = value;
  }
  return patch;
}

/** Apply `node.set`-style props to a detached FRAME before it is appended (e.g. `createAutoLayout` props). */
export interface DetachedFrameSetTarget {
  width: number;
  height: number;
  layoutMode?: string;
  resize(w: number, h: number): void;
}

export function applyDetachedFrameSetProps(
  frame: DetachedFrameSetTarget,
  props: Record<string, unknown>
): void {
  const patch = buildSetPropPatch('FRAME', props);
  const target = frame as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    target[key] = value;
  }
  const hasWidth = 'width' in props;
  const hasHeight = 'height' in props;
  if (hasWidth || hasHeight) {
    const w = hasWidth ? (props.width as number) : frame.width;
    const h = hasHeight ? (props.height as number) : frame.height;
    frame.resize(w, h);
  }
}

export function applyNodeSetProps(
  deps: ScriptQueryDeps,
  nodeId: string,
  props: Record<string, unknown>
): void {
  if (deps.deletedIds.has(nodeId)) {
    throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);
  }
  const live = findEnvelopeNode(deps.working, nodeId, deps.nodeIndex);
  if (!live) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);

  const hasWidth = 'width' in props;
  const hasHeight = 'height' in props;
  const patch = buildSetPropPatch(live.type, props);

  if (Object.keys(patch).length > 0) {
    deps.queueUpdate(nodeId, patch);
  }

  if (hasWidth || hasHeight) {
    const w = hasWidth
      ? (props.width as number)
      : ('width' in live && typeof live.width === 'number' ? live.width : 100);
    const h = hasHeight
      ? (props.height as number)
      : ('height' in live && typeof live.height === 'number' ? live.height : 100);
    const resizePatch: Record<string, unknown> = { width: w, height: h };
    if (live.type === 'FRAME' || live.type === 'INSTANCE') {
      const frame = live as { layoutMode?: string };
      if (frame.layoutMode === 'HORIZONTAL' || frame.layoutMode === 'VERTICAL') {
        resizePatch.primaryAxisSizingMode = 'FIXED';
        resizePatch.counterAxisSizingMode = 'FIXED';
      }
    }
    if (live.type === 'TEXT') {
      resizePatch.layoutSizingHorizontal = 'FIXED';
      resizePatch.layoutSizingVertical = 'FIXED';
    }
    deps.queueUpdate(nodeId, resizePatch);
  }
}

export class ScriptQueryResult {
  readonly length: number;

  constructor(
    private readonly deps: ScriptQueryDeps,
    private readonly nodeIds: string[]
  ) {
    this.length = nodeIds.length;
  }

  first(): unknown | null {
    const id = this.nodeIds[0];
    return id && !this.deps.deletedIds.has(id) ? this.deps.createHandle(id) : null;
  }

  last(): unknown | null {
    const id = this.nodeIds[this.nodeIds.length - 1];
    return id && !this.deps.deletedIds.has(id) ? this.deps.createHandle(id) : null;
  }

  toArray(): unknown[] {
    return this.nodeIds
      .filter((id) => !this.deps.deletedIds.has(id))
      .map((id) => this.deps.createHandle(id));
  }

  each(callback: (node: unknown, index: number) => void): ScriptQueryResult {
    this.toArray().forEach((node, index) => callback(node, index));
    return this;
  }

  map<T>(callback: (node: unknown, index: number) => T): T[] {
    return this.toArray().map((node, index) => callback(node, index));
  }

  filter(callback: (node: unknown, index: number) => boolean): ScriptQueryResult {
    const kept: string[] = [];
    for (let i = 0; i < this.nodeIds.length; i++) {
      const id = this.nodeIds[i]!;
      if (this.deps.deletedIds.has(id)) continue;
      const handle = this.deps.createHandle(id);
      if (callback(handle, i)) kept.push(id);
    }
    return new ScriptQueryResult(this.deps, kept);
  }

  values(keys: string[]): Record<string, unknown>[] {
    return this.nodeIds
      .filter((id) => !this.deps.deletedIds.has(id))
      .map((id) => {
        const live = findEnvelopeNode(this.deps.working, id, this.deps.nodeIndex);
        const row: Record<string, unknown> = {};
        if (!live) return row;
        for (const key of keys) {
          row[key] = (live as unknown as Record<string, unknown>)[key];
        }
        return row;
      });
  }

  set(props: Record<string, unknown>): ScriptQueryResult {
    for (const id of this.nodeIds) {
      if (this.deps.deletedIds.has(id)) continue;
      applyNodeSetProps(this.deps, id, props);
    }
    return this;
  }

  query(selector: string): ScriptQueryResult {
    const ctx: QueryContext = {
      working: this.deps.working,
      nodeIndex: this.deps.nodeIndex,
      graphIndexes: this.deps.graphIndexes,
      signal: this.deps.signal,
    };
    const merged: string[] = [];
    for (const id of this.nodeIds) {
      if (this.deps.deletedIds.has(id)) continue;
      const container = findEnvelopeNode(this.deps.working, id, this.deps.nodeIndex);
      if (!container) continue;
      for (const hit of queryDescendants(container, selector, ctx)) {
        merged.push(hit.id);
      }
    }
    return new ScriptQueryResult(this.deps, merged);
  }

  [Symbol.iterator](): Iterator<unknown> {
    const arr = this.toArray();
    let i = 0;
    return {
      next: (): IteratorResult<unknown> => {
        if (i >= arr.length) return { done: true, value: undefined };
        const value = arr[i++]!;
        return { done: false, value };
      },
    };
  }
}

export function runNodeQuery(
  deps: ScriptQueryDeps,
  container: AnyTreeNode,
  selector: string
): ScriptQueryResult {
  const ctx: QueryContext = {
    working: deps.working,
    nodeIndex: deps.nodeIndex,
    graphIndexes: deps.graphIndexes,
    signal: deps.signal,
  };
  const hits = queryDescendants(container, selector, ctx);
  return new ScriptQueryResult(
    deps,
    hits.map((n) => n.id)
  );
}

export function runNodeMatches(
  deps: ScriptQueryDeps,
  node: AnyTreeNode,
  selector: string
): boolean {
  const ctx: QueryContext = {
    working: deps.working,
    nodeIndex: deps.nodeIndex,
    graphIndexes: deps.graphIndexes,
    signal: deps.signal,
  };
  return nodeMatches(node, selector, ctx);
}
