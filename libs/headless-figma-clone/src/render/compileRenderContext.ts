import type { FrameNode, LayoutSizing, SceneNode } from '../model/types.js';

export type RenderPatch = {
  width?: number;
  height?: number;
  layoutSizingHorizontal?: LayoutSizing;
  layoutSizingVertical?: LayoutSizing;
  visible?: boolean;
  opacity?: number;
};

export type CompileRenderContext = {
  patches: Map<string, RenderPatch>;
  children?: Map<string, SceneNode[]>;
};

export type InstanceRenderOverlay = {
  instanceId: string;
  nodes: Map<string, RenderPatch>;
  children?: Map<string, SceneNode[]>;
};

export type CompileStack = {
  global: CompileRenderContext;
  instance?: InstanceRenderOverlay;
};

let activeCompileStack: CompileStack | undefined;

export function createCompileRenderContext(): CompileRenderContext {
  return { patches: new Map() };
}

export function createCompileStack(global?: CompileRenderContext): CompileStack {
  return { global: global ?? createCompileRenderContext() };
}

export function getActiveCompileStack(): CompileStack | undefined {
  return activeCompileStack;
}

export function withCompileStack<T>(stack: CompileStack | undefined, fn: () => T): T {
  const prev = activeCompileStack;
  activeCompileStack = stack;
  try {
    return fn();
  } finally {
    activeCompileStack = stack === undefined ? undefined : prev;
  }
}

export function withInstanceOverlay<T>(overlay: InstanceRenderOverlay, fn: () => T): T {
  const stack = activeCompileStack;
  if (!stack) return fn();
  const prev = stack.instance;
  stack.instance = overlay;
  try {
    return fn();
  } finally {
    stack.instance = prev;
  }
}

function patchFor(stack: CompileStack, nodeId: string): RenderPatch | undefined {
  return stack.instance?.nodes.get(nodeId) ?? stack.global.patches.get(nodeId);
}

export function renderProp<K extends keyof RenderPatch>(
  stack: CompileStack | undefined,
  node: SceneNode,
  key: K & keyof SceneNode
): (SceneNode[K] & RenderPatch[K]) | undefined {
  if (!stack) return node[key] as SceneNode[K] & RenderPatch[K];
  const p = patchFor(stack, node.id);
  if (p && key in p && p[key as K] !== undefined) {
    return p[key as K] as SceneNode[K] & RenderPatch[K];
  }
  return node[key] as SceneNode[K] & RenderPatch[K];
}

export function renderWidth(stack: CompileStack | undefined, node: { id: string; width: number }): number {
  if (!stack) return node.width;
  const w = patchFor(stack, node.id)?.width;
  return w !== undefined ? w : node.width;
}

export function renderHeight(stack: CompileStack | undefined, node: { id: string; height: number }): number {
  if (!stack) return node.height;
  const h = patchFor(stack, node.id)?.height;
  return h !== undefined ? h : node.height;
}

export function renderLayoutSizingHorizontal(
  stack: CompileStack | undefined,
  node: FrameNode
): LayoutSizing | undefined {
  if (!stack) return node.layoutSizingHorizontal;
  const v = patchFor(stack, node.id)?.layoutSizingHorizontal;
  return v !== undefined ? v : node.layoutSizingHorizontal;
}

export function renderLayoutSizingVertical(
  stack: CompileStack | undefined,
  node: FrameNode
): LayoutSizing | undefined {
  if (!stack) return node.layoutSizingVertical;
  const v = patchFor(stack, node.id)?.layoutSizingVertical;
  return v !== undefined ? v : node.layoutSizingVertical;
}

export function setPatch(ctx: CompileRenderContext, nodeId: string, patch: RenderPatch): void {
  const prev = ctx.patches.get(nodeId) ?? {};
  ctx.patches.set(nodeId, { ...prev, ...patch });
}

export function setInstancePatch(overlay: InstanceRenderOverlay, nodeId: string, patch: RenderPatch): void {
  const prev = overlay.nodes.get(nodeId) ?? {};
  overlay.nodes.set(nodeId, { ...prev, ...patch });
}

export function sceneChildrenForCompile(stack: CompileStack | undefined, node: SceneNode): SceneNode[] | null {
  if (stack?.instance?.children?.has(node.id)) {
    return stack.instance.children.get(node.id) ?? null;
  }
  if (
    node.type === 'FRAME' ||
    node.type === 'TRANSFORM_GROUP' ||
    node.type === 'GROUP' ||
    node.type === 'SECTION'
  ) {
    return node.children;
  }
  if (node.type === 'BOOLEAN_OPERATION') return node.children;
  return null;
}

/** Merge override patch fields onto instance overlay (compile-time only). */
/** Copy layout fields from a prepared subtree clone into global compile patches. */
export function copyLayoutPatchesFromTree(root: SceneNode, patches: Map<string, RenderPatch>): void {
  const walk = (n: SceneNode): void => {
    if ('width' in n && 'height' in n) {
      const prev = patches.get(n.id) ?? {};
      const patch: RenderPatch = { ...prev, width: n.width, height: n.height };
      if (n.type === 'FRAME') {
        const f = n as FrameNode;
        if (f.layoutSizingHorizontal !== undefined) {
          patch.layoutSizingHorizontal = f.layoutSizingHorizontal;
        }
        if (f.layoutSizingVertical !== undefined) {
          patch.layoutSizingVertical = f.layoutSizingVertical;
        }
      }
      patches.set(n.id, patch);
    }
    const ch =
      n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP' || n.type === 'SECTION'
        ? n.children
        : n.type === 'BOOLEAN_OPERATION'
          ? (n.children as unknown as SceneNode[])
          : null;
    if (ch) for (const c of ch) walk(c);
  };
  walk(root);
}

export function mergeRenderPatchFromOverride(
  overlay: InstanceRenderOverlay,
  nodeId: string,
  patch: RenderPatch & Record<string, unknown>
): void {
  const out: RenderPatch = {};
  if (typeof patch.width === 'number') out.width = patch.width;
  if (typeof patch.height === 'number') out.height = patch.height;
  if (patch.layoutSizingHorizontal !== undefined) out.layoutSizingHorizontal = patch.layoutSizingHorizontal;
  if (patch.layoutSizingVertical !== undefined) out.layoutSizingVertical = patch.layoutSizingVertical;
  if (Object.keys(out).length > 0) setInstancePatch(overlay, nodeId, out);
}
