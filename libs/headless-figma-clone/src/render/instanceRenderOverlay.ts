import type {
  ComponentInstanceNode,
  ComponentOverrideFields,
  FileEnvelope,
  FrameNode,
  InstanceNode,
  SceneNode,
} from '../model/types.js';
import {
  applyAutoLayoutIntrinsicSizingDeep,
  syncHugTextLayoutMetricsDeep,
} from './autoLayoutIntrinsicSizing.js';
import {
  createCompileStack,
  setInstancePatch,
  withCompileStack,
  withInstanceOverlay,
  type InstanceRenderOverlay,
  type RenderPatch,
} from './compileRenderContext.js';
import {
  applyComponentOverridesToTree,
  applyInstanceShellOverrideToRoot,
} from './instanceOverrideApply.js';
import {
  applyInstanceAppearanceToRoot,
  type InstanceAppearanceFields,
} from './instanceAppearance.js';
import {
  buildInstanceAppearanceForRoot,
  normalizeInstanceComponentRootForEmit,
} from './instancePrepare.js';
import { applyComponentProperties } from '../instances/componentProperties.js';

/** Detached export or rich overrides require a mutable clone (Phase 3 fallback). */
export function instanceCompileNeedsClone(
  inst: Pick<InstanceNode, 'children' | 'componentProperties'>,
  overrides: ComponentInstanceNode['overrides'] | undefined
): boolean {
  /** Instance overlay is not yet parity-complete with clone+prepare; keep per-instance clone. */
  void inst;
  void overrides;
  return true;
}

function patchFromOverride(patch: ComponentOverrideFields): RenderPatch {
  const out: RenderPatch = {};
  const p = patch as ComponentOverrideFields & { width?: number; height?: number };
  if (p.width !== undefined) out.width = p.width;
  if (p.height !== undefined) out.height = p.height;
  if (patch.layoutSizingHorizontal !== undefined) out.layoutSizingHorizontal = patch.layoutSizingHorizontal;
  if (patch.layoutSizingVertical !== undefined) out.layoutSizingVertical = patch.layoutSizingVertical;
  return out;
}

function applyShellPatchesToOverlay(
  overlay: InstanceRenderOverlay,
  rootId: string,
  inst: InstanceAppearanceFields & Pick<InstanceNode, 'id' | 'width' | 'height'>,
  overrides: ComponentInstanceNode['overrides'] | undefined
): void {
  setInstancePatch(overlay, rootId, { width: inst.width, height: inst.height });
  const appearance = buildInstanceAppearanceForRoot(inst, overrides);
  if (appearance.visible !== undefined) {
    setInstancePatch(overlay, rootId, { visible: appearance.visible } as RenderPatch);
  }
  if (appearance.opacity !== undefined) {
    setInstancePatch(overlay, rootId, { opacity: appearance.opacity } as RenderPatch);
  }
}

/**
 * Build per-instance overlay for emit without cloning the component master.
 * Caller must verify {@link instanceCompileNeedsClone} is false first.
 */
export function buildInstanceRenderOverlay(
  master: FrameNode,
  inst: InstanceAppearanceFields &
    Pick<InstanceNode, 'width' | 'height' | 'children' | 'componentProperties' | 'id'>,
  env: FileEnvelope,
  overrides: ComponentInstanceNode['overrides'] | undefined
): InstanceRenderOverlay {
  const overlay: InstanceRenderOverlay = {
    instanceId: inst.id,
    nodes: new Map(),
  };

  if (overrides) {
    for (const [nodeId, patch] of Object.entries(overrides)) {
      const p = patchFromOverride(patch);
      if (Object.keys(p).length > 0) overlay.nodes.set(nodeId, p);
    }
  }

  applyShellPatchesToOverlay(overlay, master.id, inst, overrides);

  const stack = createCompileStack();
  withCompileStack(stack, () => {
    withInstanceOverlay(overlay, () => {
      applyAutoLayoutIntrinsicSizingDeep(master, env);
      syncHugTextLayoutMetricsDeep(master, env);
    });
  });

  return overlay;
}

/** Populate overlay from a prepared clone (fallback path) for intrinsic patches only. */
export function copyIntrinsicPatchesFromCloneToOverlay(
  overlay: InstanceRenderOverlay,
  prepared: FrameNode
): void {
  const walk = (n: SceneNode): void => {
    if ('width' in n && 'height' in n) {
      setInstancePatch(overlay, n.id, { width: n.width, height: n.height });
    }
    if (n.type === 'FRAME') {
      const f = n as FrameNode;
      const patch: RenderPatch = {};
      if (f.layoutSizingHorizontal !== undefined) patch.layoutSizingHorizontal = f.layoutSizingHorizontal;
      if (f.layoutSizingVertical !== undefined) patch.layoutSizingVertical = f.layoutSizingVertical;
      if (Object.keys(patch).length > 0) setInstancePatch(overlay, n.id, patch);
    }
    const ch =
      n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP' || n.type === 'SECTION'
        ? n.children
        : n.type === 'BOOLEAN_OPERATION'
          ? (n.children as unknown as SceneNode[])
          : null;
    if (ch) for (const c of ch) walk(c);
  };
  walk(prepared);
}

/** Run full prepare on clone; used when instanceCompileNeedsClone is true. */
export function prepareInstanceCloneForEmit(
  root: FrameNode,
  inst: InstanceAppearanceFields &
    Pick<InstanceNode, 'width' | 'height' | 'children' | 'componentProperties' | 'id'>,
  env: FileEnvelope,
  overrides: ComponentInstanceNode['overrides'] | undefined
): void {
  applyComponentOverridesToTree(root, overrides);
  applyComponentProperties(root, inst.componentProperties);
  applyInstanceAppearanceToRoot(root, buildInstanceAppearanceForRoot(inst, overrides));
  applyInstanceShellOverrideToRoot(root, inst.id, overrides);
  normalizeInstanceComponentRootForEmit(root, inst);
  applyAutoLayoutIntrinsicSizingDeep(root, env);
  syncHugTextLayoutMetricsDeep(root, env);
}
