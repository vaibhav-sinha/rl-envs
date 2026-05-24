/**
 * Resolve COMPONENT / COMPONENT_SET masters and root frames across the document graph
 * and legacy `working.components[]` sidecar (matches DesignCompiler lookup).
 */
import type {
  ComponentDefinition,
  ComponentNode,
  ComponentSetNode,
  DocumentNode,
  FileEnvelope,
  FrameNode,
  InstanceNode,
  PageNode,
  SceneNode,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

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

/** Document walk + `components[]` sidecar lookup (scene nodes, COMPONENT stubs, master roots). */
export function resolveNodeInEnvelope(
  working: FileEnvelope,
  id: string
): SceneNode | PageNode | null {
  const document = working.document;
  for (const p of document.children) {
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
  if (target.type === 'COMPONENT') return target.id;
  const set = target;
  const key = set.variantPropertyKey ?? 'variant';
  const raw = inst.componentProperties?.[key]?.value ?? set.variantOptions?.[0];
  const options = set.variantOptions ?? set.componentIds;
  const idx = options.indexOf(String(raw));
  return set.componentIds[idx] ?? set.componentIds[0]!;
}

/** Resolved variant root frame for an INSTANCE; returns null when master is missing. */
export function resolveInstanceRootFrameOptional(
  working: FileEnvelope,
  inst: InstanceNode
): FrameNode | null {
  const target = resolveComponentOrSetInEnvelope(working, inst.mainComponentId);
  if (!target) return null;
  let componentId = inst.mainComponentId;
  if (target.type === 'COMPONENT_SET') {
    const set = target;
    const key = set.variantPropertyKey ?? 'variant';
    const raw = inst.componentProperties?.[key]?.value ?? set.variantOptions?.[0];
    const options = set.variantOptions ?? set.componentIds;
    const idx = options.indexOf(String(raw));
    componentId = set.componentIds[idx] ?? set.componentIds[0]!;
  }
  try {
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
