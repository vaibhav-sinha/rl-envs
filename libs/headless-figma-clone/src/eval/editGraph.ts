import type { AnyTreeNode, FileEnvelope } from '../model/types.js';
import { METADATA_PROPERTY_KEYS } from './types.js';
import type { EditGraph, NodeChange } from './types.js';
import { descendantIds } from './tree.js';

function collectNodes(envelope: FileEnvelope): Map<string, AnyTreeNode> {
  const map = new Map<string, AnyTreeNode>();
  const walk = (node: AnyTreeNode): void => {
    if (node.type !== 'DOCUMENT') map.set(node.id, node);
    if (node.type === 'PAGE') {
      for (const ch of node.children) walk(ch);
    } else if ('children' in node && Array.isArray((node as { children?: AnyTreeNode[] }).children)) {
      for (const ch of (node as { children: AnyTreeNode[] }).children) walk(ch);
    }
  };
  walk(envelope.document);
  return map;
}

function stableNodeJson(node: AnyTreeNode): string {
  const clone = JSON.parse(JSON.stringify(node)) as Record<string, unknown>;
  delete clone.children;
  return JSON.stringify(clone, Object.keys(clone).sort());
}

function diffProperties(before: AnyTreeNode, after: AnyTreeNode): string[] {
  const changed: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (k === 'children' || k === 'id' || k === 'type') continue;
    const b = (before as unknown as Record<string, unknown>)[k];
    const a = (after as unknown as Record<string, unknown>)[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) changed.push(k);
  }
  return changed;
}

/** Build edit graph by comparing node ids across before/after envelopes. */
export function buildEditGraph(before: FileEnvelope, after: FileEnvelope): EditGraph {
  const beforeNodes = collectNodes(before);
  const afterNodes = collectNodes(after);
  const beforeIds = new Set(beforeNodes.keys());
  const afterIds = new Set(afterNodes.keys());

  const addedIds = new Set<string>();
  const deletedIds = new Set<string>();
  const modifiedIds = new Set<string>();

  for (const id of afterIds) {
    if (!beforeIds.has(id)) addedIds.add(id);
  }
  for (const id of beforeIds) {
    if (!afterIds.has(id)) deletedIds.add(id);
  }
  for (const id of beforeIds) {
    if (!afterIds.has(id)) continue;
    const b = beforeNodes.get(id)!;
    const a = afterNodes.get(id)!;
    if (stableNodeJson(b) !== stableNodeJson(a)) modifiedIds.add(id);
  }

  const changes: NodeChange[] = [];
  for (const id of addedIds) changes.push({ nodeId: id, operation: 'add' });
  for (const id of deletedIds) changes.push({ nodeId: id, operation: 'delete' });
  for (const id of modifiedIds) {
    changes.push({
      nodeId: id,
      operation: 'modify',
      changedProperties: diffProperties(beforeNodes.get(id)!, afterNodes.get(id)!),
    });
  }

  const equal = changes.length === 0;
  return { equal, changes, addedIds, deletedIds, modifiedIds };
}

export function addedIdsUnder(graph: EditGraph, parentId: string, envelope: FileEnvelope): string[] {
  const scope = descendantIds(envelope, parentId);
  return [...graph.addedIds].filter((id) => scope.has(id));
}

export function modifiedIdsUnder(graph: EditGraph, parentId: string, envelope: FileEnvelope): string[] {
  const scope = descendantIds(envelope, parentId);
  return [...graph.modifiedIds].filter((id) => scope.has(id));
}

export function isMetadataOnlyChange(changedProperties: string[] | undefined): boolean {
  if (!changedProperties?.length) return true;
  return changedProperties.every((p) => METADATA_PROPERTY_KEYS.has(p));
}
