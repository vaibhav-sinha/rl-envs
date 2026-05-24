import { buildNodeIndex } from './engine/nodeIndex.js';
import type { AnyTreeNode, ComponentDefinition, FileEnvelope } from './model/types.js';
import { TRAVERSAL_CONTAINER_TYPES } from './traversal/findNodes.js';

const COMPONENT_NODE_TYPES = new Set(['COMPONENT', 'COMPONENT_SET']);

function isComponentNode(node: AnyTreeNode): boolean {
  return COMPONENT_NODE_TYPES.has(node.type);
}

function treeChildren(node: AnyTreeNode): AnyTreeNode[] {
  const t = node.type;
  if (t === 'DOCUMENT' || t === 'PAGE') {
    return (node as { children?: AnyTreeNode[] }).children ?? [];
  }
  if (TRAVERSAL_CONTAINER_TYPES.has(t) || t === 'BOOLEAN_OPERATION') {
    return (node as { children?: AnyTreeNode[] }).children ?? [];
  }
  return [];
}

function registerNodeRef(index: Map<string, string>, node: AnyTreeNode): void {
  const nid = node.id;
  if (!nid) return;
  index.set(nid, nid);
  const sfid = node.sourceFigmaId;
  if (!sfid) return;
  if (isComponentNode(node)) {
    index.set(sfid, nid);
  } else if (!index.has(sfid)) {
    index.set(sfid, nid);
  }
}

function walkNode(node: AnyTreeNode, index: Map<string, string>): void {
  registerNodeRef(index, node);
  for (const ch of treeChildren(node)) {
    walkNode(ch, index);
  }
}

/** Map Figma `sourceFigmaId` (and HFC `id`) → HFC node id (verifier-compatible). */
export function buildNodeRefIndex(envelope: FileEnvelope): Map<string, string> {
  const index = new Map<string, string>();
  walkNode(envelope.document, index);
  for (const def of envelope.components ?? []) {
    walkComponentDefinition(def, index);
  }
  return index;
}

function walkComponentDefinition(def: ComponentDefinition, index: Map<string, string>): void {
  walkNode(def.root, index);
}

export type ResolveNodeRefCache = {
  refIndex?: ReadonlyMap<string, string>;
  nodeIndex?: ReadonlyMap<string, AnyTreeNode>;
};

/**
 * Resolve a Figma node id (`sourceFigmaId`, e.g. `123:456`) to the envelope's HFC `id`.
 * Returns null when no node carries that `sourceFigmaId`.
 */
export function resolveHfcNodeIdBySourceFigmaId(
  envelope: FileEnvelope,
  sourceFigmaId: string,
  cache?: ResolveNodeRefCache
): string | null {
  if (!sourceFigmaId) return null;
  const hfcId = (cache?.refIndex ?? buildNodeRefIndex(envelope)).get(sourceFigmaId);
  if (!hfcId) return null;
  const nodeIndex = cache?.nodeIndex ?? buildNodeIndex(envelope);
  return nodeIndex.has(hfcId) ? hfcId : null;
}
