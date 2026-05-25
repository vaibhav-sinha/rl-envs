/**
 * Resolve COMPONENT / COMPONENT_SET masters and root frames across the document graph
 * and legacy `working.components[]` sidecar (matches DesignCompiler lookup).
 */
import type {
  ComponentNode,
  ComponentPropertyDefinition,
  ComponentPropertyValue,
  ComponentSetNode,
  DocumentNode,
  FileEnvelope,
  FrameNode,
  InstanceNode,
  PageNode,
  SceneNode,
} from '../model/types.js';
import {
  componentPropertyLabel,
  componentPropertyValuesByName,
} from '../instances/componentProperties.js';
import { ValidationErr } from '../util/errors.js';
import {
  findComponentSetForComponent,
  getEnvelopeGraphIndexes,
  type GraphIndexes,
} from './nodeIndex.js';

function findInSceneList(node: SceneNode, needle: string): SceneNode | null {
  if (node.id === needle) return node;
  if (
    node.type === 'FRAME' ||
    node.type === 'TRANSFORM_GROUP' ||
    node.type === 'GROUP' ||
    node.type === 'SECTION'
  ) {
    for (const ch of node.children) {
      const inner = findInSceneList(ch, needle);
      if (inner) return inner;
    }
  } else if (node.type === 'BOOLEAN_OPERATION') {
    for (const ch of node.children as unknown as SceneNode[]) {
      const inner = findInSceneList(ch, needle);
      if (inner) return inner;
    }
  } else if (node.type === 'INSTANCE' && node.children?.length) {
    for (const ch of node.children) {
      const inner = findInSceneList(ch, needle);
      if (inner) return inner;
    }
  }
  return null;
}

function findInPageChildren(nodes: SceneNode[], needle: string): SceneNode | null {
  for (const n of nodes) {
    const hit = findInSceneList(n, needle);
    if (hit) return hit;
  }
  return null;
}

// function componentStubFromDefinition(def: ComponentDefinition): ComponentNode {
//   return {
//     id: def.id,
//     type: 'COMPONENT',
//     name: def.name,
//     x: 0,
//     y: 0,
//     width: def.root.width,
//     height: def.root.height,
//     rootFrameId: def.root.id,
//   };
// }

/** Parse Figma variant component names like `Property 1=Selected, Has filter applied?=No`. */
export function parseVariantComponentName(name: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of name.split(', ')) {
    const eq = part.indexOf('=');
    if (eq >= 0) {
      out.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
  }
  return out;
}

function collectDesiredVariantValues(
  componentProperties: Record<string, ComponentPropertyValue> | undefined,
  definitions?: Record<string, ComponentPropertyDefinition>
): Map<string, string> {
  const desired = new Map<string, string>();
  const byName = componentPropertyValuesByName(componentProperties ?? {});
  for (const [key, val] of byName) {
    if (val.type === 'VARIANT') {
      desired.set(componentPropertyLabel(key), val.value);
    }
  }
  if (definitions) {
    for (const [defKey, def] of Object.entries(definitions)) {
      if (def.type !== 'VARIANT') continue;
      const label = componentPropertyLabel(defKey);
      if (!desired.has(label)) {
        desired.set(label, def.defaultValue);
      }
    }
  }
  return desired;
}

function variantNameMatchesDesired(name: string, desired: Map<string, string>): boolean {
  if (desired.size === 0) return false;
  const parsed = parseVariantComponentName(name);
  for (const [label, value] of desired) {
    if (parsed.get(label) !== value) return false;
  }
  return true;
}

/** Indexed lookup for the COMPONENT_SET that lists `componentId` as a variant. */
export function findComponentSetForComponentInEnvelope(
  working: FileEnvelope,
  componentId: string,
  graph?: GraphIndexes
): ComponentSetNode | null {
  return findComponentSetForComponent(graph ?? getEnvelopeGraphIndexes(working), componentId);
}

/**
 * Pick the variant COMPONENT id inside a set from instance property values.
 * Supports multi-axis sets (all VARIANT axes must match the variant component name).
 */
export function resolveVariantComponentIdInSet(
  working: FileEnvelope,
  set: ComponentSetNode,
  componentProperties?: Record<string, ComponentPropertyValue>
): string {
  const desired = collectDesiredVariantValues(
    componentProperties,
    set.componentPropertyDefinitions
  );

  if (desired.size > 0) {
    for (const cid of set.componentIds) {
      const comp = resolveComponentOrSetInEnvelope(working, cid);
      if (comp?.type === 'COMPONENT' && variantNameMatchesDesired(comp.name, desired)) {
        return cid;
      }
    }
  }

  const key = set.variantPropertyKey ?? 'variant';
  const byName = componentPropertyValuesByName(componentProperties ?? {});
  const direct = byName.get(key) ?? byName.get(componentPropertyLabel(key));
  const raw =
    direct?.type === 'VARIANT'
      ? direct.value
      : set.variantOptions?.[0];

  if (raw !== undefined) {
    for (const cid of set.componentIds) {
      const comp = resolveComponentOrSetInEnvelope(working, cid);
      if (!comp || comp.type !== 'COMPONENT') continue;
      const parsed = parseVariantComponentName(comp.name);
      if (parsed.get(key) === raw || parsed.get(componentPropertyLabel(key)) === raw) {
        return cid;
      }
    }
    const options = set.variantOptions ?? set.componentIds;
    const idx = options.indexOf(String(raw));
    if (idx >= 0 && set.componentIds[idx]) {
      return set.componentIds[idx]!;
    }
  }

  return set.baseComponentId ?? set.componentIds[0]!;
}

/** True when the instance carries explicit VARIANT property values (setProperties / import). */
export function instanceHasExplicitVariantProperties(
  componentProperties: Record<string, ComponentPropertyValue> | undefined
): boolean {
  if (!componentProperties) return false;
  return Object.values(componentProperties).some((v) => v.type === 'VARIANT');
}

function resolveComponentSetForInstanceMain(
  working: FileEnvelope,
  mainComponentId: string
): ComponentSetNode | null {
  const target = resolveComponentOrSetInEnvelope(working, mainComponentId);
  if (!target) return null;
  if (target.type === 'COMPONENT_SET') return target;
  if (target.type === 'COMPONENT') {
    return findComponentSetForComponentInEnvelope(working, target.id);
  }
  return null;
}

/** Indexed id → node lookup (pages, scene graph, component sidecar). */
export function resolveNodeInEnvelope(
  working: FileEnvelope,
  id: string,
  graph?: GraphIndexes
): SceneNode | PageNode | null {
  const hit = (graph ?? getEnvelopeGraphIndexes(working)).nodes.get(id);
  if (hit && hit.type !== 'DOCUMENT') {
    return hit as SceneNode | PageNode;
  }
  return null;
}

/** Resolve a COMPONENT or COMPONENT_SET master (graph node or sidecar stub). */
export function resolveComponentOrSetInEnvelope(
  working: FileEnvelope,
  id: string
): ComponentNode | ComponentSetNode | null {
  const hit = resolveNodeInEnvelope(working, id);
  if (hit?.type === 'COMPONENT' || hit?.type === 'COMPONENT_SET') {
    return hit;
  }
  return null;
}

/** Root frame for a COMPONENT id (after variant resolution). */
export function resolveComponentRootFrameInEnvelope(
  working: FileEnvelope,
  componentId: string
): FrameNode {
  const component = resolveComponentOrSetInEnvelope(working, componentId);
  if (!component || component.type !== 'COMPONENT') {
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE main component not found');
  }
  const root = resolveNodeInEnvelope(working, component.rootFrameId);
  if (!root || root.type !== 'FRAME') {
    throw new ValidationErr('VALIDATION_ERROR', 'COMPONENT root frame missing');
  }
  return root;
}

/** Selected COMPONENT id for an instance (COMPONENT_SET variant resolution). */
export function resolveSelectedComponentIdInEnvelope(
  working: FileEnvelope,
  inst: InstanceNode
): string {
  const target = resolveComponentOrSetInEnvelope(working, inst.mainComponentId);
  if (!target) {
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE.mainComponentId missing');
  }
  if (target.type === 'COMPONENT') {
    const set = findComponentSetForComponentInEnvelope(working, target.id);
    if (!set || !instanceHasExplicitVariantProperties(inst.componentProperties)) {
      return target.id;
    }
    return resolveVariantComponentIdInSet(working, set, inst.componentProperties);
  }
  return resolveVariantComponentIdInSet(working, target, inst.componentProperties);
}

/** Owning COMPONENT_SET when the instance main is a set or a variant component; else null. */
export function resolveComponentSetForInstance(
  working: FileEnvelope,
  inst: InstanceNode
): ComponentSetNode | null {
  return resolveComponentSetForInstanceMain(working, inst.mainComponentId);
}

/** Resolved variant root frame for an INSTANCE; returns null when master is missing. */
export function resolveInstanceRootFrameOptional(
  working: FileEnvelope,
  inst: InstanceNode
): FrameNode | null {
  try {
    const componentId = resolveSelectedComponentIdInEnvelope(working, inst);
    return resolveComponentRootFrameInEnvelope(working, componentId);
  } catch {
    return null;
  }
}

/** Resolved variant root frame for an INSTANCE (for detach / refresh). */
export function resolveInstanceRootFrameInEnvelope(
  working: FileEnvelope,
  inst: InstanceNode
): FrameNode {
  const root = resolveInstanceRootFrameOptional(working, inst);
  if (!root) {
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE.mainComponentId missing');
  }
  return root;
}

/** @deprecated Use {@link resolveNodeInEnvelope} — kept for DesignCompiler import migration. */
export function findNodeInDocument(
  document: DocumentNode,
  id: string,
  env?: FileEnvelope
): SceneNode | PageNode | null {
  if (!env) {
    for (const p of document.children) {
      if (p.id === id) return p;
      const hit = findInPageChildren(p.children, id);
      if (hit) return hit;
    }
    return null;
  }
  return resolveNodeInEnvelope(env, id);
}
