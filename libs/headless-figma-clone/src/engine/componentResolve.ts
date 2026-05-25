/**
 * Resolve COMPONENT / COMPONENT_SET masters and root frames across the document graph
 * and legacy `working.components[]` sidecar (matches DesignCompiler lookup).
 */
import type {
  ComponentDefinition,
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
  tryGetEnvelopeGraphIndexes,
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

function componentStubFromDefinition(def: ComponentDefinition): ComponentNode {
  return {
    id: def.id,
    type: 'COMPONENT',
    name: def.name,
    x: 0,
    y: 0,
    width: def.root.width,
    height: def.root.height,
    rootFrameId: def.root.id,
  };
}

/** Live document walk + `components[]` sidecar (no graph build). */
function resolveNodeInEnvelopeWalk(
  working: FileEnvelope,
  id: string
): SceneNode | PageNode | null {
  for (const p of working.document.children) {
    if (p.id === id) return p;
    const hit = findInPageChildren(p.children, id);
    if (hit) return hit;
  }
  if (working.components) {
    for (const c of working.components) {
      if (c.id === id) {
        return componentStubFromDefinition(c);
      }
      if (c.root.id === id) return c.root;
    }
  }
  return null;
}

const walkResolveCache = new WeakMap<FileEnvelope, Map<string, SceneNode | PageNode | null>>();

function resolveNodeInEnvelopeWalkCached(
  working: FileEnvelope,
  id: string
): SceneNode | PageNode | null {
  let cache = walkResolveCache.get(working);
  if (!cache) {
    cache = new Map();
    walkResolveCache.set(working, cache);
  }
  if (cache.has(id)) return cache.get(id)!;
  const found = resolveNodeInEnvelopeWalk(working, id);
  cache.set(id, found);
  return found;
}

const lazyComponentSetByComponentId = new WeakMap<FileEnvelope, Map<string, string>>();

function scanComponentSetByComponentId(working: FileEnvelope): Map<string, string> {
  let map = lazyComponentSetByComponentId.get(working);
  if (map) return map;
  map = new Map();
  function scan(nodes: SceneNode[]): void {
    for (const n of nodes) {
      if (n.type === 'COMPONENT_SET') {
        for (const cid of n.componentIds) map!.set(cid, n.id);
      }
      if (
        n.type === 'FRAME' ||
        n.type === 'TRANSFORM_GROUP' ||
        n.type === 'GROUP' ||
        n.type === 'SECTION'
      ) {
        scan(n.children);
      } else if (n.type === 'BOOLEAN_OPERATION') {
        scan(n.children as unknown as SceneNode[]);
      } else if (n.type === 'INSTANCE' && n.children?.length) {
        scan(n.children);
      }
    }
  }
  for (const page of working.document.children) {
    scan(page.children);
  }
  lazyComponentSetByComponentId.set(working, map);
  return map;
}

function findComponentSetForComponentWalk(
  working: FileEnvelope,
  componentId: string,
  graph?: GraphIndexes
): ComponentSetNode | null {
  const setId = scanComponentSetByComponentId(working).get(componentId);
  if (!setId) return null;
  const set = resolveNodeInEnvelope(working, setId, graph);
  return set?.type === 'COMPONENT_SET' ? set : null;
}

function graphForResolve(working: FileEnvelope, graph?: GraphIndexes): GraphIndexes | undefined {
  return graph ?? tryGetEnvelopeGraphIndexes(working);
}

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

/** Lookup the COMPONENT_SET containing `componentId` (indexed when graph exists, else one scan). */
export function findComponentSetForComponentInEnvelope(
  working: FileEnvelope,
  componentId: string,
  graph?: GraphIndexes
): ComponentSetNode | null {
  const g = graphForResolve(working, graph);
  if (g) return findComponentSetForComponent(g, componentId);
  return findComponentSetForComponentWalk(working, componentId, graph);
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
  mainComponentId: string,
  graph?: GraphIndexes
): ComponentSetNode | null {
  const target = resolveComponentOrSetInEnvelope(working, mainComponentId, graph);
  if (!target) return null;
  if (target.type === 'COMPONENT_SET') return target;
  if (target.type === 'COMPONENT') {
    return findComponentSetForComponentInEnvelope(working, target.id, graph);
  }
  return null;
}

/** Resolve id → node using the engine graph when present, else cached tree walk. */
export function resolveNodeInEnvelope(
  working: FileEnvelope,
  id: string,
  graph?: GraphIndexes
): SceneNode | PageNode | null {
  const g = graphForResolve(working, graph);
  if (g) {
    const hit = g.nodes.get(id);
    if (hit && hit.type !== 'DOCUMENT') {
      return hit as SceneNode | PageNode;
    }
  }
  return resolveNodeInEnvelopeWalkCached(working, id);
}

/** Resolve a COMPONENT or COMPONENT_SET master (graph node or sidecar stub). */
export function resolveComponentOrSetInEnvelope(
  working: FileEnvelope,
  id: string,
  graph?: GraphIndexes
): ComponentNode | ComponentSetNode | null {
  const hit = resolveNodeInEnvelope(working, id, graph);
  if (hit?.type === 'COMPONENT' || hit?.type === 'COMPONENT_SET') {
    return hit;
  }
  return null;
}

/** Root frame for a COMPONENT id (after variant resolution). */
export function resolveComponentRootFrameInEnvelope(
  working: FileEnvelope,
  componentId: string,
  graph?: GraphIndexes
): FrameNode {
  const component = resolveComponentOrSetInEnvelope(working, componentId, graph);
  if (!component || component.type !== 'COMPONENT') {
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE main component not found');
  }
  const root = resolveNodeInEnvelope(working, component.rootFrameId, graph);
  if (!root || root.type !== 'FRAME') {
    throw new ValidationErr('VALIDATION_ERROR', 'COMPONENT root frame missing');
  }
  return root;
}

/** Selected COMPONENT id for an instance (COMPONENT_SET variant resolution). */
export function resolveSelectedComponentIdInEnvelope(
  working: FileEnvelope,
  inst: InstanceNode,
  graph?: GraphIndexes
): string {
  const target = resolveComponentOrSetInEnvelope(working, inst.mainComponentId, graph);
  if (!target) {
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE.mainComponentId missing');
  }
  if (target.type === 'COMPONENT') {
    const set = findComponentSetForComponentInEnvelope(working, target.id, graph);
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
  inst: InstanceNode,
  graph?: GraphIndexes
): ComponentSetNode | null {
  return resolveComponentSetForInstanceMain(working, inst.mainComponentId, graph);
}

/** Resolved variant root frame for an INSTANCE; returns null when master is missing. */
export function resolveInstanceRootFrameOptional(
  working: FileEnvelope,
  inst: InstanceNode,
  graph?: GraphIndexes
): FrameNode | null {
  try {
    const componentId = resolveSelectedComponentIdInEnvelope(working, inst, graph);
    return resolveComponentRootFrameInEnvelope(working, componentId, graph);
  } catch {
    return null;
  }
}

/** Resolved variant root frame for an INSTANCE (for detach / refresh). */
export function resolveInstanceRootFrameInEnvelope(
  working: FileEnvelope,
  inst: InstanceNode,
  graph?: GraphIndexes
): FrameNode {
  const root = resolveInstanceRootFrameOptional(working, inst, graph);
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
