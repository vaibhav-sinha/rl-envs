import type { GraphIndexes } from './nodeIndex.js';
import type { FileEnvelope, InstanceNode, SceneNode } from '../model/types.js';
import {
  buildPreparedInstanceRoot,
  instanceDetachedChildren,
} from '../render/instancePrepare.js';
import {
  fallbackKey,
  mergeNodePairFromDetached,
  normalizeSourceFigmaId,
  type InstanceMergeContext,
} from '../render/instanceMerge.js';

const MATERIALIZE_LEAF_TYPES = new Set<SceneNode['type']>([
  'RECTANGLE',
  'ELLIPSE',
  'VECTOR',
  'LINE',
  'POLYGON',
  'STAR',
  'TEXT',
]);

function mergeKey(node: SceneNode): string | undefined {
  return normalizeSourceFigmaId(node.sourceFigmaId);
}

function sceneChildren(node: SceneNode): SceneNode[] | null {
  if (
    node.type === 'FRAME' ||
    node.type === 'TRANSFORM_GROUP' ||
    node.type === 'GROUP' ||
    node.type === 'SECTION'
  ) {
    return node.children;
  }
  if (node.type === 'BOOLEAN_OPERATION') {
    return node.children as unknown as SceneNode[];
  }
  if (node.type === 'INSTANCE' && node.children?.length) {
    return node.children;
  }
  return null;
}

function findMatchingNodeInTree(root: SceneNode, source: SceneNode): SceneNode | null {
  const figmaKey = mergeKey(source);
  const nameKey = fallbackKey(source);
  const stack: SceneNode[] = [root];
  let figmaHit: SceneNode | null = null;
  let nameHit: SceneNode | null = null;

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === source.type) {
      const nodeKey = mergeKey(node);
      if (figmaKey && nodeKey === figmaKey) {
        figmaHit = node;
        break;
      }
      if (!figmaHit && fallbackKey(node) === nameKey) {
        nameHit = node;
      }
    }
    const kids = sceneChildren(node);
    if (kids) stack.push(...kids);
  }

  return figmaHit ?? nameHit;
}

function findNearestInstanceAncestor(
  nodeId: string,
  indexes: GraphIndexes
): InstanceNode | null {
  let cur: string | null | undefined = nodeId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const node = indexes.nodes.get(cur);
    if (node?.type === 'INSTANCE') return node as InstanceNode;
    const parentId = indexes.parentById.get(cur);
    if (parentId === undefined || parentId === null) break;
    cur = parentId;
  }
  return null;
}

function findMatchingDetachedNode(inst: InstanceNode, source: SceneNode): SceneNode | null {
  const detached = instanceDetachedChildren(inst);
  if (!detached?.length) return null;
  for (const root of detached) {
    const hit = findMatchingNodeInTree(root, source);
    if (hit) return hit;
  }
  return null;
}

function applyMaterializedAppearance(
  clone: SceneNode,
  prepared: SceneNode,
  mergeCtx: InstanceMergeContext
): void {
  mergeNodePairFromDetached(clone, prepared, mergeCtx);
}

/** True when duplicateNode should bake instance-merged appearance onto a leaf clone. */
export function shouldMaterializeDuplicatedClone(node: SceneNode): boolean {
  return MATERIALIZE_LEAF_TYPES.has(node.type);
}

/**
 * After duplicateNode, copy merged instance appearance onto leaf clones that would otherwise
 * render with raw master paints only. Skips container clones (whole frames/screens).
 */
export function maybeMaterializeDuplicatedCloneAppearance(
  working: FileEnvelope,
  source: SceneNode,
  cloned: SceneNode,
  indexes: GraphIndexes
): void {
  if (!shouldMaterializeDuplicatedClone(cloned)) return;

  const inst = findNearestInstanceAncestor(source.id, indexes);
  if (!inst) return;

  const mergeCtx: InstanceMergeContext = { warnings: [], overrides: inst.overrides };
  const preparedRoot = buildPreparedInstanceRoot(working, inst, mergeCtx);
  const preparedMatch = preparedRoot ? findMatchingNodeInTree(preparedRoot, source) : null;
  if (preparedMatch) {
    applyMaterializedAppearance(cloned, preparedMatch, mergeCtx);
    return;
  }

  const detachedMatch = findMatchingDetachedNode(inst, source);
  if (detachedMatch) {
    applyMaterializedAppearance(cloned, detachedMatch, mergeCtx);
  }
}

/** @internal Test helper — nearest INSTANCE ancestor via cached parent map. */
export function nearestInstanceAncestorForTest(
  nodeId: string,
  indexes: GraphIndexes
): InstanceNode | null {
  return findNearestInstanceAncestor(nodeId, indexes);
}