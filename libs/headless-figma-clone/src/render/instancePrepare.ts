/**
 * Shared instance root preparation (merge detached subtrees, overrides, appearance).
 * Used by DesignCompiler emit paths.
 */
import { applyComponentProperties } from '../instances/componentProperties.js';
import {
  applyAutoLayoutIntrinsicSizingDeep,
  syncHugTextLayoutMetricsDeep,
} from './autoLayoutIntrinsicSizing.js';
import {
  applyInstanceAppearanceToRoot,
  hasOwnAppearanceField,
  type InstanceAppearanceFields,
} from './instanceAppearance.js';
import {
  applyComponentOverridesToTree,
  applyInstanceShellOverrideToRoot,
} from './instanceOverrideApply.js';
import {
  mergeDetachedChildrenIntoRoot,
  type InstanceMergeContext,
} from './instanceMerge.js';
import type {
  ComponentInstanceNode,
  ComponentOverrideFields,
  FileEnvelope,
  FrameNode,
  InstanceNode,
  SceneNode,
} from '../model/types.js';

function cloneComponentRoot(root: FrameNode): FrameNode {
  return structuredClone(root) as FrameNode;
}

/** Component masters are often hidden on the canvas; instances must still render their contents. */
export function cloneComponentRootForInstance(root: FrameNode): FrameNode {
  const cloned = cloneComponentRoot(root);
  cloned.visible = true;
  return cloned;
}

/** Fit cloned component root to instance bounds without scaling child geometry (Figma parity). */
export function normalizeInstanceComponentRootForEmit(
  root: FrameNode,
  inst: Pick<InstanceNode, 'width' | 'height'>
): void {
  root.width = inst.width;
  root.height = inst.height;
}

export function instanceDetachedChildren(inst: Pick<InstanceNode, 'children'>): SceneNode[] | undefined {
  const ch = inst.children;
  return ch?.length ? ch : undefined;
}

export function buildInstanceAppearanceForRoot(
  inst: InstanceAppearanceFields & Pick<InstanceNode, 'id'>,
  overrides: ComponentInstanceNode['overrides'] | undefined
): InstanceAppearanceFields {
  const appearance: InstanceAppearanceFields = { ...inst };
  const shell = overrides?.[inst.id];
  if (
    hasOwnAppearanceField(appearance, 'strokes') &&
    (appearance.strokes?.length ?? 0) === 0 &&
    (shell?.strokes?.length ?? 0) > 0
  ) {
    delete appearance.strokes;
  }
  return appearance;
}

/** Drop stale shell paints inherited from a different component-set slot. */
export function alignInstanceShellToVariantRoot(inst: InstanceNode, variantRoot: FrameNode): void {
  const variantFillCount = variantRoot.fills?.length ?? 0;
  const variantStrokeCount = variantRoot.strokes?.length ?? 0;
  if (hasOwnAppearanceField(inst, 'fills') && (inst.fills?.length ?? 0) > 0 && variantFillCount === 0) {
    inst.fills = [];
    delete inst.fillStyleId;
  }
  if (hasOwnAppearanceField(inst, 'strokes') && (inst.strokes?.length ?? 0) > 0 && variantStrokeCount === 0) {
    inst.strokes = [];
    delete inst.strokeStyleId;
  }
}

function syncClearedShellToComponentRoot(
  root: FrameNode,
  inst: InstanceAppearanceFields,
  overrides?: Record<string, ComponentOverrideFields>,
  instanceId?: string
): void {
  const shell = instanceId ? overrides?.[instanceId] : undefined;
  if (
    hasOwnAppearanceField(inst, 'fills') &&
    (inst.fills?.length ?? 0) === 0 &&
    !(shell && Object.prototype.hasOwnProperty.call(shell, 'fills'))
  ) {
    root.fills = [];
    delete root.fillStyleId;
  }
  if (
    hasOwnAppearanceField(inst, 'strokes') &&
    (inst.strokes?.length ?? 0) === 0 &&
    !(shell && Object.prototype.hasOwnProperty.call(shell, 'strokes'))
  ) {
    root.strokes = [];
    delete root.strokeStyleId;
  }
}

export function prepareInstanceComponentRoot(
  root: FrameNode,
  inst: InstanceAppearanceFields &
    Pick<InstanceNode, 'width' | 'height' | 'children' | 'componentProperties' | 'id'>,
  env: FileEnvelope,
  overrides: ComponentInstanceNode['overrides'] | undefined,
  mergeCtx: InstanceMergeContext
): void {
  applyComponentOverridesToTree(root, overrides);
  applyComponentProperties(root, inst.componentProperties);
  const detached = instanceDetachedChildren(inst);
  if (detached) {
    mergeDetachedChildrenIntoRoot(root, detached, mergeCtx);
  }
  applyInstanceAppearanceToRoot(root, buildInstanceAppearanceForRoot(inst, overrides));
  applyInstanceShellOverrideToRoot(root, inst.id, overrides);
  syncClearedShellToComponentRoot(root, inst, overrides, inst.id);
  normalizeInstanceComponentRootForEmit(root, inst);
  prepareClonedComponentSubtreeForEmit(root, env);
}

/** Instance/component clones are not in compile roots; run intrinsic sizing passes. */
export function prepareClonedComponentSubtreeForEmit(root: SceneNode, env: FileEnvelope): void {
  applyAutoLayoutIntrinsicSizingDeep(root, env);
  syncHugTextLayoutMetricsDeep(root, env);
}
