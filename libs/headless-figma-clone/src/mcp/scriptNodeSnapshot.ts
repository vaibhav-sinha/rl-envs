import { ENGINE_MATRIX } from '../engine/phase-matrix.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import { buildGraphIndexes, resolveParentNode, type GraphIndexes } from '../engine/nodeIndex.js';
import type { AnyTreeNode, FileEnvelope } from '../model/types.js';
import { getImmediateSceneChildren } from '../traversal/findNodes.js';
import { FIGMA_STYLE_TYPE, type StyleRoute } from '../styles/styleTypes.js';
import type { TextStyleDefinition } from '../model/types.js';

export const HFC_HANDLE_MARKER = Symbol.for('hfc.nodeHandle');
export const HFC_STYLE_MARKER = Symbol.for('hfc.styleHandle');
/** String marker on proxy targets so `in` / replacer detects handles reliably. */
export const HFC_HANDLE_FLAG = '__hfcHandle';
export const HFC_STYLE_FLAG = '__hfcStyle';
/** Marks {@link RuntimePage} in useFigmaScript; do not confuse with arbitrary `{ pageId: string }` POJOs. */
export const HFC_RUNTIME_PAGE_MARKER = Symbol.for('hfc.runtimePage');

export interface SnapshotContext {
  working: FileEnvelope;
  deletedIds: Set<string>;
  graphIndexes?: GraphIndexes;
}

function snapshotGraphIndexes(ctx: SnapshotContext): GraphIndexes {
  return ctx.graphIndexes ?? buildGraphIndexes(ctx.working);
}

export interface SnapshotOptions {
  maxDepth?: number;
  maxNodes?: number;
}

export interface SnapshotResult {
  value: unknown;
  warnings: string[];
}

interface SnapshotState {
  ctx: SnapshotContext;
  depth: number;
  maxDepth: number;
  maxNodes: number;
  nodeCount: number;
  visited: Set<string>;
  warnings: string[];
}

function loadSnapshotOptions(): SnapshotOptions {
  const depthRaw = process.env.HFC_SCRIPT_RETURN_MAX_DEPTH;
  const nodesRaw = process.env.HFC_SCRIPT_RETURN_MAX_NODES;
  const maxDepth = depthRaw !== undefined ? Number(depthRaw) : 20;
  const maxNodes = nodesRaw !== undefined ? Number(nodesRaw) : 5000;
  return {
    maxDepth: Number.isFinite(maxDepth) && maxDepth >= 0 ? maxDepth : 20,
    maxNodes: Number.isFinite(maxNodes) && maxNodes > 0 ? maxNodes : 5000,
  };
}

function isJsonSafeValue(v: unknown): v is string | number | boolean | null {
  const t = typeof v;
  return t === 'string' || t === 'number' || t === 'boolean' || v === null;
}

export function isHandleTarget(v: unknown): v is { id: string } {
  if (typeof v !== 'object' || v === null) return false;
  const rec = v as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    (rec[HFC_HANDLE_FLAG] === true || Reflect.get(v, HFC_HANDLE_MARKER) === true)
  );
}

export function isStyleTarget(v: unknown): v is { id: string; styleRoute: StyleRoute } {
  if (typeof v !== 'object' || v === null) return false;
  const rec = v as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    (rec[HFC_STYLE_FLAG] === true || Reflect.get(v, HFC_STYLE_MARKER) === true)
  );
}

export function isRuntimePage(v: unknown): v is { pageId: string } {
  return typeof v === 'object' && v !== null && Reflect.get(v, HFC_RUNTIME_PAGE_MARKER) === true;
}

function budgetAllows(state: SnapshotState): boolean {
  if (state.nodeCount >= state.maxNodes) {
    if (!state.warnings.includes('return snapshot truncated: max node budget')) {
      state.warnings.push('return snapshot truncated: max node budget');
    }
    return false;
  }
  return true;
}

function stubNode(id: string, ctx: SnapshotContext): Record<string, unknown> {
  const live = findEnvelopeNode(ctx.working, id);
  if (!live || ctx.deletedIds.has(id)) return { id };
  return { id: live.id, type: live.type, name: live.name };
}

function envelopeFieldsForType(node: AnyTreeNode): Record<string, unknown> {
  const allowed = (ENGINE_MATRIX.patchKeysByType as Record<string, Set<string> | undefined>)[node.type];
  const out: Record<string, unknown> = {
    id: node.id,
    type: node.type,
    name: node.name,
  };
  if (!allowed) return out;
  for (const key of allowed) {
    if (key === 'name') continue;
    const v = (node as unknown as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (typeof v === 'function') continue;
    out[key] = v;
  }
  return out;
}

function snapshotParent(ctx: SnapshotContext, nodeId: string): Record<string, unknown> | null {
  const parent = resolveParentNode(snapshotGraphIndexes(ctx), nodeId);
  if (!parent) return null;
  return { id: parent.id, type: parent.type, name: parent.name };
}

function snapshotChildrenField(
  node: AnyTreeNode,
  ctx: SnapshotContext,
  state: SnapshotState
): unknown[] | undefined {
  const kids = getImmediateSceneChildren(node, ctx.working).filter((c) => !ctx.deletedIds.has(c.id));
  if (kids.length === 0) return undefined;
  const nextDepth = state.depth + 1;
  if (nextDepth > state.maxDepth) {
    return kids.map((c) => stubNode(c.id, ctx));
  }
  return kids.map((c) => {
    const prev = state.depth;
    state.depth = nextDepth;
    const snap = snapshotNodeById(c.id, ctx, state);
    state.depth = prev;
    return snap;
  });
}

function snapshotNodeById(nodeId: string, ctx: SnapshotContext, state: SnapshotState): Record<string, unknown> {
  if (state.visited.has(nodeId)) {
    return stubNode(nodeId, ctx);
  }
  state.visited.add(nodeId);

  if (!budgetAllows(state)) {
    return stubNode(nodeId, ctx);
  }
  state.nodeCount += 1;

  if (ctx.deletedIds.has(nodeId)) return { id: nodeId };

  const live = findEnvelopeNode(ctx.working, nodeId);
  if (!live) return { id: nodeId };

  if (state.depth > state.maxDepth) {
    return stubNode(nodeId, ctx);
  }

  const dto = envelopeFieldsForType(live);
  const parent = snapshotParent(ctx, nodeId);
  if (parent) dto.parent = parent;

  if (
    live.type === 'PAGE' ||
    live.type === 'FRAME' ||
    live.type === 'GROUP' ||
    live.type === 'TRANSFORM_GROUP' ||
    live.type === 'SECTION' ||
    live.type === 'BOOLEAN_OPERATION' ||
    live.type === 'COMPONENT' ||
    live.type === 'COMPONENT_SET' ||
    live.type === 'INSTANCE' ||
    live.type === 'COMPONENT_INSTANCE'
  ) {
    const children = snapshotChildrenField(live, ctx, state);
    if (children !== undefined) dto.children = children;
  }

  return dto;
}

function snapshotPage(pageId: string, ctx: SnapshotContext, state: SnapshotState): Record<string, unknown> {
  return snapshotNodeById(pageId, ctx, state);
}

function textStyleSnapshotFields(s: TextStyleDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = { name: s.name };
  if (s.fontName !== undefined) out.fontName = s.fontName;
  if (s.fontSize !== undefined) out.fontSize = s.fontSize;
  if (s.fontWeight !== undefined) out.fontWeight = s.fontWeight;
  if (s.fills !== undefined) out.fills = s.fills;
  if (s.textDecoration !== undefined) out.textDecoration = s.textDecoration;
  if (s.letterSpacing !== undefined) out.letterSpacing = s.letterSpacing;
  if (s.lineHeight !== undefined) out.lineHeight = s.lineHeight;
  if (s.leadingTrim !== undefined) out.leadingTrim = s.leadingTrim;
  if (s.paragraphIndent !== undefined) out.paragraphIndent = s.paragraphIndent;
  if (s.paragraphSpacing !== undefined) out.paragraphSpacing = s.paragraphSpacing;
  if (s.listSpacing !== undefined) out.listSpacing = s.listSpacing;
  if (s.hangingPunctuation !== undefined) out.hangingPunctuation = s.hangingPunctuation;
  if (s.hangingList !== undefined) out.hangingList = s.hangingList;
  if (s.textCase !== undefined) out.textCase = s.textCase;
  if (s.boundVariables !== undefined) out.boundVariables = s.boundVariables;
  return out;
}

function snapshotStyle(
  target: { id: string; styleRoute: StyleRoute },
  ctx: SnapshotContext
): Record<string, unknown> {
  const { working } = ctx;
  const base: Record<string, unknown> = { id: target.id, type: FIGMA_STYLE_TYPE[target.styleRoute] };
  if (target.styleRoute === 'paint') {
    const s = working.paintStyles?.find((x) => x.id === target.id);
    if (s) return { ...base, name: s.name, paints: s.paints };
  }
  if (target.styleRoute === 'text') {
    const s = working.textStyles?.find((x) => x.id === target.id);
    if (s) return { ...base, ...textStyleSnapshotFields(s) };
  }
  if (target.styleRoute === 'effect') {
    const s = working.effectStyles?.find((x) => x.id === target.id);
    if (s) return { ...base, name: s.name, effects: s.effects };
  }
  if (target.styleRoute === 'grid') {
    const s = working.gridStyles?.find((x) => x.id === target.id);
    if (s) return { ...base, name: s.name, layoutGrids: s.layoutGrids };
  }
  return base;
}

function snapshotRuntimeSceneNode(
  node: {
    type: string;
    name: string;
    attached: boolean;
    getAttachedIdOrNull(): string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    visible?: boolean;
    opacity?: number;
    rotation?: number;
  },
  ctx: SnapshotContext,
  state: SnapshotState
): Record<string, unknown> {
  const id = node.getAttachedIdOrNull();
  if (node.attached && id !== null) {
    return snapshotNodeById(id, ctx, state);
  }
  const reservedId =
    'id' in node && typeof (node as { id: unknown }).id === 'string'
      ? (node as { id: string }).id
      : undefined;
  return {
    ...(reservedId !== undefined ? { id: reservedId } : {}),
    type: node.type,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    ...(node.visible !== undefined ? { visible: node.visible } : {}),
    ...(node.opacity !== undefined ? { opacity: node.opacity } : {}),
    ...(node.rotation !== undefined ? { rotation: node.rotation } : {}),
  };
}

function snapshotValue(value: unknown, ctx: SnapshotContext, state: SnapshotState): unknown {
  if (value === undefined) return undefined;
  if (isJsonSafeValue(value)) return value;
  if (Array.isArray(value)) {
    return value.map((item) => snapshotValue(item, ctx, state));
  }
  if (isHandleTarget(value)) {
    return snapshotNodeById(value.id, ctx, state);
  }
  if (isStyleTarget(value)) {
    return snapshotStyle(value, ctx);
  }
  if (isRuntimePage(value)) {
    return snapshotPage(value.pageId, ctx, state);
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'getAttachedIdOrNull' in value &&
    typeof (value as { getAttachedIdOrNull: unknown }).getAttachedIdOrNull === 'function'
  ) {
    return snapshotRuntimeSceneNode(
      value as {
        type: string;
        name: string;
        attached: boolean;
        getAttachedIdOrNull(): string | null;
        x: number;
        y: number;
        width: number;
        height: number;
        visible?: boolean;
        opacity?: number;
        rotation?: number;
      },
      ctx,
      state
    );
  }
  if (typeof value === 'object' && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = snapshotValue(v, ctx, state);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return undefined;
}

export function snapshotForReturn(
  raw: unknown,
  ctx: SnapshotContext,
  options?: SnapshotOptions
): SnapshotResult {
  const defaults = loadSnapshotOptions();
  const state: SnapshotState = {
    ctx,
    depth: 0,
    maxDepth: options?.maxDepth ?? defaults.maxDepth ?? 20,
    maxNodes: options?.maxNodes ?? defaults.maxNodes ?? 5000,
    nodeCount: 0,
    visited: new Set(),
    warnings: [],
  };

  let value: unknown;
  try {
    value = JSON.parse(
      JSON.stringify(raw, (_key, v) => {
        if (v === undefined) return undefined;
        if (isJsonSafeValue(v)) return v;
        const snap = snapshotValue(v, ctx, state);
        return snap === undefined ? undefined : snap;
      })
    );
  } catch {
    value = String(raw);
    state.warnings.push('return value was not fully JSON-serializable');
  }

  return { value, warnings: state.warnings };
}
