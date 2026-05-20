import type { AnyTreeNode, FileEnvelope, SceneNode } from '../model/types.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import { throwIfAborted } from '../mcp/inFlightAbort.js';
import { ValidationErr } from '../util/errors.js';

export interface TraversalOptions {
  signal?: AbortSignal;
}

const ABORT_CHECK_EVERY = 256;
let walkStep = 0;

function stepTraversal(signal?: AbortSignal): void {
  if (!signal) return;
  walkStep += 1;
  if (walkStep % ABORT_CHECK_EVERY === 0) throwIfAborted(signal);
}

export interface FindCriteria {
  types?: string[];
  name?: string;
  /** Case-insensitive substring match when `name` is set. */
  nameMatch?: 'exact' | 'contains';
  visible?: boolean;
}

/** Node types that support Figma `findAll` / `findChildren` (HFC subset). */
export const TRAVERSAL_CONTAINER_TYPES = new Set([
  'PAGE',
  'FRAME',
  'GROUP',
  'TRANSFORM_GROUP',
  'SECTION',
  'BOOLEAN_OPERATION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'COMPONENT_INSTANCE',
]);

export function nodeSupportsTraversal(type: string): boolean {
  return TRAVERSAL_CONTAINER_TYPES.has(type);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseFindCriteria(raw: unknown): FindCriteria {
  if (raw === undefined || raw === null) return {};
  if (!isRecord(raw)) {
    throw new ValidationErr('VALIDATION_ERROR', 'find criteria must be an object');
  }
  const out: FindCriteria = {};
  if ('types' in raw) {
    const t = raw.types;
    if (!Array.isArray(t) || !t.every((x) => typeof x === 'string')) {
      throw new ValidationErr('VALIDATION_ERROR', 'criteria.types must be string array');
    }
    out.types = t;
  }
  if ('name' in raw && raw.name !== undefined) {
    if (typeof raw.name !== 'string') {
      throw new ValidationErr('VALIDATION_ERROR', 'criteria.name must be string');
    }
    out.name = raw.name;
    const nm = raw.nameMatch;
    if (nm !== undefined) {
      if (nm !== 'exact' && nm !== 'contains') {
        throw new ValidationErr('VALIDATION_ERROR', 'criteria.nameMatch must be exact or contains');
      }
      out.nameMatch = nm;
    } else {
      out.nameMatch = 'contains';
    }
  }
  if ('visible' in raw && raw.visible !== undefined) {
    if (typeof raw.visible !== 'boolean') {
      throw new ValidationErr('VALIDATION_ERROR', 'criteria.visible must be boolean');
    }
    out.visible = raw.visible;
  }
  return out;
}

export function nodeMatches(node: AnyTreeNode, criteria: FindCriteria): boolean {
  if (criteria.types && criteria.types.length > 0 && !criteria.types.includes(node.type)) {
    return false;
  }
  if (criteria.name !== undefined) {
    const n = node.name ?? '';
    const q = criteria.name;
    const mode = criteria.nameMatch ?? 'contains';
    if (mode === 'exact') {
      if (n !== q) return false;
    } else if (!n.toLowerCase().includes(q.toLowerCase())) {
      return false;
    }
  }
  if (criteria.visible !== undefined) {
    const vis = 'visible' in node ? (node as { visible?: boolean }).visible : true;
    if ((vis ?? true) !== criteria.visible) return false;
  }
  return true;
}

function collectStructuralChildren(node: AnyTreeNode): SceneNode[] {
  if (node.type === 'DOCUMENT') return [];
  if (node.type === 'PAGE') return node.children;
  if (
    node.type === 'FRAME' ||
    node.type === 'TRANSFORM_GROUP' ||
    node.type === 'GROUP' ||
    node.type === 'SECTION'
  ) {
    return node.children;
  }
  if (node.type === 'BOOLEAN_OPERATION') return node.children as unknown as SceneNode[];
  return [];
}

function resolveInstanceMainComponentId(
  working: FileEnvelope,
  inst: import('../model/types.js').InstanceNode | import('../model/types.js').ComponentInstanceNode
): string | null {
  const main = findEnvelopeNode(working, inst.mainComponentId);
  if (!main) return null;
  if (main.type === 'COMPONENT') return main.id;
  if (main.type === 'COMPONENT_SET') {
    const set = main as import('../model/types.js').ComponentSetNode;
    const key = set.variantPropertyKey ?? 'variant';
    const raw =
      inst.type === 'INSTANCE'
        ? (inst as import('../model/types.js').InstanceNode).componentProperties?.[key]?.value ??
          set.variantOptions?.[0]
        : set.variantOptions?.[0];
    const options = set.variantOptions ?? set.componentIds;
    const idx = options.indexOf(String(raw));
    return set.componentIds[idx] ?? set.componentIds[0] ?? null;
  }
  return null;
}

/** Direct children of the instance's resolved main component root frame (not nested descendants). */
function instanceMainComponentDirectChildren(
  working: FileEnvelope,
  inst: import('../model/types.js').InstanceNode | import('../model/types.js').ComponentInstanceNode
): SceneNode[] {
  const compId = resolveInstanceMainComponentId(working, inst);
  if (!compId) return [];
  return componentRootFrameChildren(working, compId);
}

/** Immediate children for traversal APIs (Figma `children` / `findChildren`). */
export function getImmediateSceneChildren(node: AnyTreeNode, working: FileEnvelope): SceneNode[] {
  if (node.type === 'COMPONENT') {
    const frame = findEnvelopeNode(working, node.rootFrameId);
    if (frame?.type === 'FRAME') return frame.children;
    return [];
  }
  if (node.type === 'COMPONENT_SET') {
    const out: SceneNode[] = [];
    for (const cid of node.componentIds) {
      const comp = findEnvelopeNode(working, cid);
      if (comp && comp.type === 'COMPONENT') out.push(comp as SceneNode);
    }
    return out;
  }
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT_INSTANCE') {
    return instanceMainComponentDirectChildren(working, node);
  }
  return collectStructuralChildren(node);
}

function componentRootFrameChildren(working: FileEnvelope, componentId: string): SceneNode[] {
  const comp = findEnvelopeNode(working, componentId);
  if (!comp || comp.type !== 'COMPONENT') return [];
  const frame = findEnvelopeNode(working, comp.rootFrameId);
  if (frame?.type === 'FRAME') return frame.children;
  return [];
}

/** Entry nodes for `findAll` descendant walk (excludes the container node itself). */
export function getDescendantWalkRoots(node: AnyTreeNode, working: FileEnvelope): SceneNode[] {
  if (node.type === 'COMPONENT') {
    return componentRootFrameChildren(working, node.id);
  }
  if (node.type === 'COMPONENT_SET') {
    const roots: SceneNode[] = [];
    for (const cid of node.componentIds) {
      roots.push(...componentRootFrameChildren(working, cid));
    }
    return roots;
  }
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT_INSTANCE') {
    return instanceMainComponentDirectChildren(working, node);
  }
  return getImmediateSceneChildren(node, working);
}

function walkPreorder(
  node: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria,
  out: AnyTreeNode[],
  predicate?: (node: AnyTreeNode) => boolean,
  signal?: AbortSignal
): void {
  stepTraversal(signal);
  if (node.type !== 'DOCUMENT') {
    const ok = predicate ? predicate(node) : nodeMatches(node, criteria);
    if (ok) out.push(node);
  }
  for (const ch of getImmediateSceneChildren(node, working)) {
    walkPreorder(ch, working, criteria, out, predicate, signal);
  }
}

function walkFromRoots(
  roots: SceneNode[],
  working: FileEnvelope,
  criteria: FindCriteria,
  out: AnyTreeNode[],
  predicate?: (node: AnyTreeNode) => boolean,
  signal?: AbortSignal
): void {
  for (const root of roots) {
    walkPreorder(root, working, criteria, out, predicate, signal);
  }
}

/**
 * All descendants of `container` (Figma `findAll`: **does not** include `container`).
 */
export function findAllDescendants(
  container: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria = {},
  predicate?: (node: AnyTreeNode) => boolean,
  options?: TraversalOptions
): AnyTreeNode[] {
  const signal = options?.signal;
  throwIfAborted(signal);
  const out: AnyTreeNode[] = [];
  if (container.type === 'DOCUMENT') {
    for (const p of container.children) {
      walkFromRoots(p.children, working, criteria, out, predicate, signal);
    }
    return out;
  }
  walkFromRoots(getDescendantWalkRoots(container, working), working, criteria, out, predicate, signal);
  return out;
}

export function findOneDescendant(
  container: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria = {},
  predicate?: (node: AnyTreeNode) => boolean,
  options?: TraversalOptions
): AnyTreeNode | null {
  return findAllDescendants(container, working, criteria, predicate, options)[0] ?? null;
}

export function findImmediateChildren(
  container: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria = {},
  predicate?: (node: AnyTreeNode) => boolean,
  options?: TraversalOptions
): AnyTreeNode[] {
  throwIfAborted(options?.signal);
  const kids = getImmediateSceneChildren(container, working);
  const out: AnyTreeNode[] = [];
  for (const ch of kids) {
    const ok = predicate ? predicate(ch) : nodeMatches(ch, criteria);
    if (ok) out.push(ch);
  }
  return out;
}

function walkLegacySubtree(node: AnyTreeNode, criteria: FindCriteria, out: AnyTreeNode[]): void {
  for (const ch of collectStructuralChildren(node)) {
    if (nodeMatches(ch, criteria)) out.push(ch);
    walkLegacySubtree(ch, criteria, out);
  }
}

/** Depth-first descendants (excludes `root` unless `root` is DOCUMENT). Legacy criteria API. */
export function findAllNodes(root: AnyTreeNode, criteria: FindCriteria = {}): AnyTreeNode[] {
  const out: AnyTreeNode[] = [];
  if (root.type === 'DOCUMENT') {
    for (const p of root.children) walkLegacySubtree(p, criteria, out);
  } else {
    walkLegacySubtree(root, criteria, out);
  }
  return out;
}

export function findOneNode(root: AnyTreeNode, criteria: FindCriteria = {}): AnyTreeNode | null {
  return findAllNodes(root, criteria)[0] ?? null;
}
