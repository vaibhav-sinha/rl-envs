/**
 * Shared instance root preparation (merge detached subtrees, overrides, appearance).
 * Used by DesignCompiler emit paths.
 */
import { applyComponentProperties, resolveVariantPropertyValue } from '../instances/componentProperties.js';
import {
  resolveComponentOrSetInEnvelope,
  resolveNodeInEnvelope,
} from '../engine/componentResolve.js';
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
  ComponentNode,
  ComponentOverrideFields,
  ComponentSetNode,
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

function remapOverridesForVariant(
  overrides: InstanceNode['overrides'],
  nodeIdMap?: Record<string, string>
): InstanceNode['overrides'] {
  if (!overrides) return overrides;
  if (!nodeIdMap) return overrides;
  const variantToBase: Record<string, string> = {};
  for (const [baseId, variantId] of Object.entries(nodeIdMap)) {
    variantToBase[variantId] = baseId;
  }
  const out: NonNullable<InstanceNode['overrides']> = {};
  for (const [key, ov] of Object.entries(overrides)) {
    const variantId = nodeIdMap[key];
    if (variantId) {
      out[variantId] = ov;
    } else if (variantToBase[key]) {
      out[key] = ov;
    } else {
      out[key] = ov;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Clone + merge an INSTANCE master the same way {@link DesignCompiler} does before emit.
 * Returns null when the master cannot be resolved.
 */
export function buildPreparedInstanceRoot(
  env: FileEnvelope,
  inst: InstanceNode,
  mergeCtx: InstanceMergeContext
): FrameNode | null {
  const target = resolveComponentOrSetInEnvelope(env, inst.mainComponentId);

  if (!target && env.components) {
    const main = env.components.find((c) => c.id === inst.mainComponentId);
    if (main) {
      const root = cloneComponentRootForInstance(main.root);
      prepareInstanceComponentRoot(root, inst, env, inst.overrides, mergeCtx);
      return root;
    }
  }

  if (!target || (target.type !== 'COMPONENT' && target.type !== 'COMPONENT_SET')) {
    return null;
  }

  let root: FrameNode;
  let appliedOverrides: InstanceNode['overrides'] = inst.overrides;

  if (target.type === 'COMPONENT') {
    const component = target as ComponentNode;
    const rootNode = resolveNodeInEnvelope(env, component.rootFrameId);
    if (!rootNode || rootNode.type !== 'FRAME') return null;
    alignInstanceShellToVariantRoot(inst, rootNode as FrameNode);
    root = cloneComponentRootForInstance(rootNode as FrameNode);
  } else {
    const set = target as ComponentSetNode;
    const selectedValue = resolveVariantPropertyValue(inst.componentProperties, set);
    const options = set.variantOptions ?? set.componentIds;
    const idx = options.indexOf(String(selectedValue));
    const selectedComponentId = set.componentIds[idx] ?? set.componentIds[0];
    if (!selectedComponentId) return null;

    const selectedComponent = resolveNodeInEnvelope(env, selectedComponentId);
    if (!selectedComponent || selectedComponent.type !== 'COMPONENT') return null;
    const comp = selectedComponent as ComponentNode;
    const rootNode = resolveNodeInEnvelope(env, comp.rootFrameId);
    if (!rootNode || rootNode.type !== 'FRAME') return null;
    alignInstanceShellToVariantRoot(inst, rootNode as FrameNode);
    root = cloneComponentRootForInstance(rootNode as FrameNode);

    const nodeIdMap = set.nodeIdMapByComponentId?.[selectedComponentId];
    appliedOverrides = remapOverridesForVariant(inst.overrides, nodeIdMap);
  }

  prepareInstanceComponentRoot(root, inst, env, appliedOverrides as ComponentInstanceNode['overrides'], mergeCtx);
  return root;
}
