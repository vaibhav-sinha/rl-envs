import type { DocumentNode, FileEnvelope, SceneNode, VectorPathData } from '../model/types.js';
import type { EngineOperation } from './DocumentEngine.js';
import { applyCreateNodeOp, applyEngineOp, findEnvelopeNode } from './DocumentEngine.js';
import { ValidationErr } from '../util/errors.js';

type ParentRef = { id: string };

export function boundsOfNodes(nodes: SceneNode[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 100, height: 100 };
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function readNodeId(n: { id: string }): string {
  return n.id;
}

/** Queue ops to group nodes under a new GROUP (mutates working + ops). */
export function queueGroupNodes(
  working: FileEnvelope,
  ops: EngineOperation[],
  nodeIds: string[],
  parent: ParentRef,
  index?: number
): string {
  if (nodeIds.length < 1) {
    throw new ValidationErr('VALIDATION_ERROR', 'group requires at least one node');
  }
  const nodes: SceneNode[] = [];
  for (const id of nodeIds) {
    const live = findEnvelopeNode(working, id);
    if (!live || live.type === 'DOCUMENT' || live.type === 'PAGE') {
      throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
    }
    nodes.push(live as SceneNode);
  }
  const box = boundsOfNodes(nodes);
  const createOp: EngineOperation = {
    op: 'createNode',
    parentId: parent.id,
    index,
    node: { type: 'GROUP', name: 'Group', x: box.x, y: box.y, width: box.width, height: box.height },
  };
  ops.push(createOp);
  const groupId = applyCreateNodeOp(working, createOp);
  for (let i = 0; i < nodeIds.length; i++) {
    const nid = nodeIds[i]!;
    const n = nodes[i]!;
    const relX = n.x - box.x;
    const relY = n.y - box.y;
    const mv: EngineOperation = { op: 'moveNode', nodeId: nid, newParentId: groupId, index: i };
    ops.push(mv);
    applyEngineOp(working, mv);
    const up: EngineOperation = { op: 'updateNode', nodeId: nid, patch: { x: relX, y: relY } };
    ops.push(up);
    applyEngineOp(working, up);
  }
  return groupId;
}

/** Ungroup: reparent children to group's parent, delete group. */
export function queueUngroup(
  working: FileEnvelope,
  ops: EngineOperation[],
  groupId: string
): string[] {
  const group = findEnvelopeNode(working, groupId);
  if (!group || group.type !== 'GROUP') {
    throw new ValidationErr('VALIDATION_ERROR', 'ungroup target must be GROUP');
  }
  const parent = findParentOf(working.document, groupId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown parent for ${groupId}`);
  const parentId = parent.id;
  const parentList = parentChildren(parent);
  const groupIdx = parentList.findIndex((c) => c.id === groupId);
  const moved: string[] = [];
  const children = [...group.children];
  for (let i = 0; i < children.length; i++) {
    const ch = children[i]!;
    const absX = group.x + ch.x;
    const absY = group.y + ch.y;
    const mv: EngineOperation = { op: 'moveNode', nodeId: ch.id, newParentId: parentId, index: groupIdx + i };
    ops.push(mv);
    applyEngineOp(working, mv);
    const up: EngineOperation = { op: 'updateNode', nodeId: ch.id, patch: { x: absX, y: absY } };
    ops.push(up);
    applyEngineOp(working, up);
    moved.push(ch.id);
  }
  const del: EngineOperation = { op: 'deleteNode', nodeId: groupId };
  ops.push(del);
  applyEngineOp(working, del);
  return moved;
}

function findParentOf(
  root: DocumentNode,
  id: string
): { id: string; children: SceneNode[] } | null {
  for (const page of root.children) {
    if (page.id === id) return null;
    const hit = findParentInList(page.children, id, page);
    if (hit) return hit;
  }
  return null;
}

function findParentInList(
  list: SceneNode[],
  id: string,
  parent: { id: string; children: SceneNode[] }
): { id: string; children: SceneNode[] } | null {
  for (const n of list) {
    if (n.id === id) return parent;
    if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
      const inner = findParentInList(n.children, id, n);
      if (inner) return inner;
    }
    if (n.type === 'BOOLEAN_OPERATION') {
      const inner = findParentInList(n.children as unknown as SceneNode[], id, n as unknown as { id: string; children: SceneNode[] });
      if (inner) return inner;
    }
  }
  return null;
}

function parentChildren(parent: { children: SceneNode[] }): SceneNode[] {
  return parent.children;
}

/** Flatten nodes into a single VECTOR (simplified path union). */
export function queueFlattenNodes(
  working: FileEnvelope,
  ops: EngineOperation[],
  nodeIds: string[],
  parent: ParentRef,
  index?: number
): string {
  if (nodeIds.length < 1) {
    throw new ValidationErr('VALIDATION_ERROR', 'flatten requires at least one node');
  }
  const nodes: SceneNode[] = [];
  for (const id of nodeIds) {
    const live = findEnvelopeNode(working, id);
    if (!live || live.type === 'DOCUMENT' || live.type === 'PAGE') {
      throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${id}`);
    }
    nodes.push(live as SceneNode);
  }
  const box = boundsOfNodes(nodes);
  const pathParts: string[] = [];
  for (const n of nodes) {
    const local = simplePathForNode(n, n.x - box.x, n.y - box.y);
    if (local) pathParts.push(local);
  }
  const data = pathParts.length > 0 ? pathParts.join(' ') : `M0,0 H${String(box.width)} V${String(box.height)} H0 Z`;
  const paths: VectorPathData[] = [{ windingRule: 'NONZERO', data }];
  const createOp: EngineOperation = {
    op: 'createNode',
    parentId: parent.id,
    index,
    node: {
      type: 'VECTOR',
      name: 'Flattened',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      vectorPaths: paths,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 } }],
    },
  };
  ops.push(createOp);
  const vecId = applyCreateNodeOp(working, createOp);
  for (const id of nodeIds) {
    const del: EngineOperation = { op: 'deleteNode', nodeId: id };
    ops.push(del);
    applyEngineOp(working, del);
  }
  return vecId;
}

function simplePathForNode(n: SceneNode, ox: number, oy: number): string | null {
  const tx = (x: number, y: number) => `${String(x + ox)},${String(y + oy)}`;
  if (n.type === 'RECTANGLE') {
    return `M${tx(0, 0)} H${tx(n.width, 0)} V${tx(n.width, n.height)} H${tx(0, n.height)} Z`;
  }
  if (n.type === 'ELLIPSE') {
    const cx = n.width / 2 + ox;
    const cy = n.height / 2 + oy;
    const rx = n.width / 2;
    const ry = n.height / 2;
    return `M${String(cx)},${String(cy - ry)} A${String(rx)},${String(ry)} 0 1,1 ${String(cx)},${String(cy + ry)} A${String(rx)},${String(ry)} 0 1,1 ${String(cx)},${String(cy - ry)} Z`;
  }
  if (n.type === 'VECTOR' && n.vectorPaths?.[0]?.data) {
    return n.vectorPaths[0].data;
  }
  return `M${tx(0, 0)} H${tx(n.width, 0)} V${tx(n.height, 0)} H${tx(0, 0)} Z`;
}

export { readNodeId };
