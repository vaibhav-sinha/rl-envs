import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { AnyTreeNode, FileEnvelope, SceneNode } from '../model/types.js';

function collectChildren(node: AnyTreeNode): SceneNode[] {
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

/** All node ids in subtree rooted at `rootId` (includes root). */
export function descendantIds(envelope: FileEnvelope, rootId: string): Set<string> {
  const root = findEnvelopeNode(envelope, rootId);
  if (!root) return new Set();

  const ids = new Set<string>();
  const walk = (node: AnyTreeNode): void => {
    if (node.type !== 'DOCUMENT') ids.add(node.id);
    for (const ch of collectChildren(node)) walk(ch);
  };
  walk(root);
  return ids;
}

/** All node ids in the file (excluding DOCUMENT). */
export function allNodeIds(envelope: FileEnvelope): Set<string> {
  const ids = new Set<string>();
  const walk = (node: AnyTreeNode): void => {
    if (node.type !== 'DOCUMENT') ids.add(node.id);
    for (const ch of collectChildren(node)) walk(ch);
  };
  walk(envelope.document);
  return ids;
}

export function nodeExists(envelope: FileEnvelope, nodeId: string): boolean {
  return findEnvelopeNode(envelope, nodeId) !== null;
}

export function isInstanceNode(node: AnyTreeNode): boolean {
  return node.type === 'INSTANCE' || node.type === 'COMPONENT_INSTANCE';
}

export function getMainComponentId(node: AnyTreeNode): string | null {
  if (!isInstanceNode(node)) return null;
  const rec = node as { mainComponentId?: string };
  return rec.mainComponentId ?? null;
}

/** Read nested property by dot path (e.g. layoutMode). */
export function getNodeProperty(node: AnyTreeNode, property: string): unknown {
  const parts = property.split('.');
  let cur: unknown = node;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
