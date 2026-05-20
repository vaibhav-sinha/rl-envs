import type { AnyTreeNode, FileEnvelope, SceneNode } from '../model/types.js';
import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import { ValidationErr } from '../util/errors.js';

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
  if (node.type === 'INSTANCE' && node.children?.length) return node.children;
  return [];
}

function resolveMainComponentRootFrame(
  working: FileEnvelope,
  mainComponentId: string
): SceneNode[] {
  const main = findEnvelopeNode(working, mainComponentId);
  if (!main) return [];
  if (main.type === 'COMPONENT') {
    const root = findEnvelopeNode(working, main.rootFrameId);
    if (root?.type === 'FRAME') return root.children;
    return [];
  }
  if (main.type === 'COMPONENT_SET') {
    const firstId = main.componentIds[0];
    if (!firstId) return [];
    return resolveMainComponentRootFrame(working, firstId);
  }
  return [];
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
  if (node.type === 'INSTANCE') {
    const direct = collectStructuralChildren(node);
    if (direct.length > 0) return direct;
    return resolveMainComponentRootFrame(working, node.mainComponentId);
  }
  if (node.type === 'COMPONENT_INSTANCE') {
    return resolveMainComponentRootFrame(working, node.mainComponentId);
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
  if (node.type === 'INSTANCE') {
    const direct = collectStructuralChildren(node);
    if (direct.length > 0) return direct;
    return componentRootFrameChildren(working, node.mainComponentId);
  }
  if (node.type === 'COMPONENT_INSTANCE') {
    return componentRootFrameChildren(working, node.mainComponentId);
  }
  return getImmediateSceneChildren(node, working);
}

function walkPreorder(
  node: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria,
  out: AnyTreeNode[],
  predicate?: (node: AnyTreeNode) => boolean
): void {
  if (node.type !== 'DOCUMENT') {
    const ok = predicate ? predicate(node) : nodeMatches(node, criteria);
    if (ok) out.push(node);
  }
  for (const ch of getImmediateSceneChildren(node, working)) {
    walkPreorder(ch, working, criteria, out, predicate);
  }
}

function walkFromRoots(
  roots: SceneNode[],
  working: FileEnvelope,
  criteria: FindCriteria,
  out: AnyTreeNode[],
  predicate?: (node: AnyTreeNode) => boolean
): void {
  for (const root of roots) {
    walkPreorder(root, working, criteria, out, predicate);
  }
}

/**
 * All descendants of `container` (Figma `findAll`: **does not** include `container`).
 */
export function findAllDescendants(
  container: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria = {},
  predicate?: (node: AnyTreeNode) => boolean
): AnyTreeNode[] {
  const out: AnyTreeNode[] = [];
  if (container.type === 'DOCUMENT') {
    for (const p of container.children) {
      walkFromRoots(p.children, working, criteria, out, predicate);
    }
    return out;
  }
  walkFromRoots(getDescendantWalkRoots(container, working), working, criteria, out, predicate);
  return out;
}

export function findOneDescendant(
  container: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria = {},
  predicate?: (node: AnyTreeNode) => boolean
): AnyTreeNode | null {
  return findAllDescendants(container, working, criteria, predicate)[0] ?? null;
}

export function findImmediateChildren(
  container: AnyTreeNode,
  working: FileEnvelope,
  criteria: FindCriteria = {},
  predicate?: (node: AnyTreeNode) => boolean
): AnyTreeNode[] {
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
