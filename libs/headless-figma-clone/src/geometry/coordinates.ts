import type { AnyTreeNode } from '../engine/DocumentEngine.js';
import type { GraphIndexes } from '../engine/nodeIndex.js';
import type { SceneNode } from '../model/types.js';

/** Figma container parents: translation in x/y is relative to this node's parent. */
export function isContainerParent(type: string): boolean {
  return type === 'PAGE' || type === 'FRAME' || type === 'SECTION' || type === 'COMPONENT' || type === 'INSTANCE';
}

/** Non-container wrappers — descendants keep the same container-parent coordinate reference. */
export function isCoordWrapper(type: string): boolean {
  return type === 'GROUP' || type === 'BOOLEAN_OPERATION' || type === 'TRANSFORM_GROUP';
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BoundingBox extends Point, Size {}

/** Stored translation from node fields (Plugin API x/y, kept in sync with relativeTransform). */
export function getStoredTranslation(node: Pick<SceneNode, 'x' | 'y' | 'relativeTransform'>): Point {
  const rt = node.relativeTransform;
  if (rt && rt.length >= 2) {
    const tx = rt[0]?.[2];
    const ty = rt[1]?.[2];
    if (typeof tx === 'number' && typeof ty === 'number') {
      return { x: tx, y: ty };
    }
  }
  return { x: node.x ?? 0, y: node.y ?? 0 };
}

/**
 * Walk up from the node's immediate parent to find the container parent whose
 * coordinate space stored x/y on `nodeId` are relative to (skipping GROUP / BOOLEAN / TRANSFORM_GROUP).
 */
export function getContainerParentNodeId(nodeId: string, graph: GraphIndexes): string | null {
  let currentId = graph.parentById.get(nodeId);
  if (currentId === undefined || currentId === null) return null;

  while (currentId !== null) {
    const node = graph.nodes.get(currentId);
    if (!node) return null;
    if (isContainerParent(node.type)) return currentId;
    if (node.type === 'DOCUMENT') return null;
    const parentId = graph.parentById.get(currentId);
    if (parentId === undefined || parentId === null) return null;
    currentId = parentId;
  }

  return null;
}

export function getContainerParentNode(nodeId: string, graph: GraphIndexes): AnyTreeNode | null {
  const id = getContainerParentNodeId(nodeId, graph);
  if (!id) return null;
  return graph.nodes.get(id) ?? null;
}

/** Page-absolute origin of a node (axis-aligned sum of container-parent translations; phase 1). */
export function computeAbsoluteOrigin(nodeId: string, graph: GraphIndexes): Point {
  const node = graph.nodes.get(nodeId);
  if (!node || !('x' in node)) return { x: 0, y: 0 };

  const containerParentId = getContainerParentNodeId(nodeId, graph);
  if (!containerParentId) {
    return getStoredTranslation(node as SceneNode);
  }

  const parentAbs = computeAbsoluteOrigin(containerParentId, graph);
  const local = getStoredTranslation(node as SceneNode);
  return { x: parentAbs.x + local.x, y: parentAbs.y + local.y };
}

export function computeAbsoluteBoundingBox(nodeId: string, graph: GraphIndexes): BoundingBox | null {
  const node = graph.nodes.get(nodeId);
  if (!node || !('width' in node) || !('height' in node)) return null;
  const origin = computeAbsoluteOrigin(nodeId, graph);
  return {
    x: origin.x,
    y: origin.y,
    width: (node as SceneNode).width ?? 0,
    height: (node as SceneNode).height ?? 0,
  };
}

/** Import helper: derive container-parent-relative translation from page-absolute bounds. */
export function parentRelativeFromAbsolute(
  abs: Point,
  parentAbs: Point
): Point {
  return { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y };
}

/**
 * CSS offset for a node nested inside a GROUP div when both use container-parent-relative storage.
 * Converts container-parent-relative coords to group-local CSS inside the group wrapper.
 */
export function groupLocalOffsetFromContainerRelative(
  node: Pick<SceneNode, 'x' | 'y'>,
  group: Pick<SceneNode, 'x' | 'y'>
): Point {
  return {
    x: (node.x ?? 0) - (group.x ?? 0),
    y: (node.y ?? 0) - (group.y ?? 0),
  };
}

/** Page-absolute origin passed to children during import (skips non-container wrappers). */
export function containerChildPageOrigin(
  parentPageOrigin: Point | undefined,
  parentBounds: Point,
  parentType: string
): Point {
  if (isContainerParent(parentType)) {
    return {
      x: (parentPageOrigin?.x ?? 0) + parentBounds.x,
      y: (parentPageOrigin?.y ?? 0) + parentBounds.y,
    };
  }
  return {
    x: parentPageOrigin?.x ?? 0,
    y: parentPageOrigin?.y ?? 0,
  };
}
