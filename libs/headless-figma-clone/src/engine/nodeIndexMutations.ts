import type { AnyTreeNode, EngineOperation, SceneGraphOperation } from './DocumentEngine.js';
import { findEnvelopeNode, isSceneGraphOperation } from './DocumentEngine.js';
import type { GraphIndexes } from './nodeIndex.js';
import type {
  ComponentNode,
  ComponentSetNode,
  FileEnvelope,
  SceneNode,
} from '../model/types.js';

type MutableGraphIndexes = {
  nodes: Map<string, AnyTreeNode>;
  parentById: Map<string, string | null>;
  componentSetByComponentId: Map<string, string>;
};

function asMutable(graph: GraphIndexes): MutableGraphIndexes {
  return graph as MutableGraphIndexes;
}

function registerComponentSet(set: ComponentSetNode, parentId: string, maps: MutableGraphIndexes): void {
  maps.nodes.set(set.id, set);
  maps.parentById.set(set.id, parentId);
  for (const cid of set.componentIds) {
    maps.componentSetByComponentId.set(cid, set.id);
  }
}

function indexComponentRootFrame(
  comp: ComponentNode,
  maps: MutableGraphIndexes,
  working: FileEnvelope
): void {
  const frame = findEnvelopeNode(working, comp.rootFrameId, maps.nodes);
  if (!frame || frame.type !== 'FRAME') return;
  maps.nodes.set(frame.id, frame);
  maps.parentById.set(frame.id, comp.id);
  indexSceneSubtree(maps, frame.children, frame.id, working);
}

/** Index a scene subtree under `parentId` (mutates graph maps). */
export function indexSceneSubtree(
  graph: GraphIndexes,
  nodes: SceneNode[],
  parentId: string,
  working: FileEnvelope
): void {
  const maps = asMutable(graph);
  for (const n of nodes) {
    maps.nodes.set(n.id, n);
    maps.parentById.set(n.id, parentId);

    if (n.type === 'COMPONENT_SET') {
      registerComponentSet(n, parentId, maps);
      continue;
    }
    if (n.type === 'COMPONENT') {
      indexComponentRootFrame(n, maps, working);
      continue;
    }
    if (
      n.type === 'FRAME' ||
      n.type === 'TRANSFORM_GROUP' ||
      n.type === 'GROUP' ||
      n.type === 'SECTION'
    ) {
      indexSceneSubtree(graph, n.children, n.id, working);
    } else if (n.type === 'BOOLEAN_OPERATION') {
      indexSceneSubtree(graph, n.children as unknown as SceneNode[], n.id, working);
    } else if (n.type === 'INSTANCE' && n.children?.length) {
      indexSceneSubtree(graph, n.children, n.id, working);
    }
  }
}

/** Index one scene/page node and its descendants. */
export function indexSceneNode(
  graph: GraphIndexes,
  node: SceneNode | import('../model/types.js').PageNode,
  parentId: string,
  working: FileEnvelope
): void {
  const maps = asMutable(graph);
  maps.nodes.set(node.id, node);
  maps.parentById.set(node.id, parentId);
  if (node.type === 'PAGE') {
    indexSceneSubtree(graph, node.children, node.id, working);
    return;
  }
  if (node.type === 'COMPONENT_SET') {
    registerComponentSet(node, parentId, maps);
    return;
  }
  if (node.type === 'COMPONENT') {
    indexComponentRootFrame(node, maps, working);
    return;
  }
  if (
    node.type === 'FRAME' ||
    node.type === 'TRANSFORM_GROUP' ||
    node.type === 'GROUP' ||
    node.type === 'SECTION'
  ) {
    indexSceneSubtree(graph, node.children, node.id, working);
  } else if (node.type === 'BOOLEAN_OPERATION') {
    indexSceneSubtree(graph, node.children as unknown as SceneNode[], node.id, working);
  } else if (node.type === 'INSTANCE' && node.children?.length) {
    indexSceneSubtree(graph, node.children, node.id, working);
  }
}

function unindexSceneNode(graph: GraphIndexes, node: SceneNode): void {
  const maps = asMutable(graph);
  maps.nodes.delete(node.id);
  maps.parentById.delete(node.id);
  if (node.type === 'COMPONENT_SET') {
    for (const cid of node.componentIds) {
      maps.componentSetByComponentId.delete(cid);
    }
  }
  if (
    node.type === 'FRAME' ||
    node.type === 'TRANSFORM_GROUP' ||
    node.type === 'GROUP' ||
    node.type === 'SECTION'
  ) {
    for (const ch of node.children) unindexSceneNode(graph, ch);
  } else if (node.type === 'BOOLEAN_OPERATION') {
    for (const ch of node.children as unknown as SceneNode[]) unindexSceneNode(graph, ch);
  } else if (node.type === 'INSTANCE' && node.children?.length) {
    for (const ch of node.children) unindexSceneNode(graph, ch);
  } else if (node.type === 'COMPONENT') {
    const comp = node as ComponentNode;
    const root = maps.nodes.get(comp.rootFrameId);
    if (root && root.type === 'FRAME') {
      unindexSceneNode(graph, root);
    }
  }
}

/** Remove a node and all indexed descendants from graph maps. */
export function unindexSceneSubtree(graph: GraphIndexes, root: SceneNode): void {
  unindexSceneNode(graph, root);
}

export function unindexNodeById(graph: GraphIndexes, nodeId: string): void {
  const node = graph.nodes.get(nodeId);
  if (!node || node.type === 'DOCUMENT') return;
  if (node.type === 'PAGE') {
    const maps = asMutable(graph);
    maps.nodes.delete(nodeId);
    maps.parentById.delete(nodeId);
    for (const ch of node.children) unindexSceneNode(graph, ch);
    return;
  }
  unindexSceneNode(graph, node as SceneNode);
}

/** Collect node ids that deleteNode will remove (target + cascade instances + component root frame). */
export function collectDeleteUnindexIds(working: FileEnvelope, nodeId: string): string[] {
  const target = findEnvelopeNode(working, nodeId);
  if (!target || target.type === 'DOCUMENT' || target.type === 'PAGE') {
    return [nodeId];
  }
  const targetNode = target as SceneNode;
  const out = new Set<string>();

  function walkSubtree(n: SceneNode): void {
    out.add(n.id);
    if (
      n.type === 'FRAME' ||
      n.type === 'TRANSFORM_GROUP' ||
      n.type === 'GROUP' ||
      n.type === 'SECTION'
    ) {
      for (const ch of n.children) walkSubtree(ch);
    } else if (n.type === 'BOOLEAN_OPERATION') {
      for (const ch of n.children as unknown as SceneNode[]) walkSubtree(ch);
    } else if (n.type === 'INSTANCE' && n.children?.length) {
      for (const ch of n.children) walkSubtree(ch);
    }
  }

  walkSubtree(targetNode);

  if (targetNode.type === 'COMPONENT' || targetNode.type === 'COMPONENT_SET') {
    const instanceIdsToDelete = new Set<string>();

    function walkInstances(nodes: SceneNode[]): void {
      for (const n of nodes) {
        if (n.type === 'INSTANCE' || n.type === 'COMPONENT_INSTANCE') {
          const mid = (n as { mainComponentId: string }).mainComponentId;
          if (targetNode.type === 'COMPONENT_SET') {
            if (mid === targetNode.id) instanceIdsToDelete.add(n.id);
          } else if (targetNode.type === 'COMPONENT') {
            if (mid === targetNode.id) {
              instanceIdsToDelete.add(n.id);
            } else {
              const maybeSet = findEnvelopeNode(working, mid);
              if (maybeSet?.type === 'COMPONENT_SET') {
                if ((maybeSet as ComponentSetNode).componentIds.includes(targetNode.id)) {
                  instanceIdsToDelete.add(n.id);
                }
              }
            }
          }
        }
        if (
          n.type === 'FRAME' ||
          n.type === 'TRANSFORM_GROUP' ||
          n.type === 'GROUP' ||
          n.type === 'SECTION'
        ) {
          walkInstances(n.children);
        } else if (n.type === 'BOOLEAN_OPERATION') {
          walkInstances(n.children as unknown as SceneNode[]);
        }
      }
    }

    for (const p of working.document.children) {
      walkInstances(p.children);
    }

    for (const iid of instanceIdsToDelete) {
      const inst = findEnvelopeNode(working, iid);
      if (inst && inst.type !== 'DOCUMENT' && inst.type !== 'PAGE') {
        walkSubtree(inst as SceneNode);
      }
    }

    if (targetNode.type === 'COMPONENT') {
      out.add(targetNode.rootFrameId);
    }
  }

  return [...out];
}

/** Patch graph indexes after a scene-graph engine op has been applied. */
export function applyIndexForEngineOp(
  graph: GraphIndexes,
  working: FileEnvelope,
  op: EngineOperation,
  resultId?: string
): void {
  if (!isSceneGraphOperation(op)) return;

  if (op.op === 'createNode') {
    if (!resultId) return;
    const node = findEnvelopeNode(working, resultId, graph.nodes);
    if (!node) return;
    indexSceneNode(graph, node as SceneNode | import('../model/types.js').PageNode, op.parentId, working);
    return;
  }

  if (op.op === 'duplicateNode') {
    if (!resultId) return;
    const parentId = graph.parentById.get(op.nodeId);
    if (parentId === undefined || parentId === null) return;
    const clone = findEnvelopeNode(working, resultId, graph.nodes);
    if (!clone || clone.type === 'DOCUMENT' || clone.type === 'PAGE') return;
    indexSceneNode(graph, clone as SceneNode, parentId, working);
    return;
  }

  if (op.op === 'moveNode') {
    asMutable(graph).parentById.set(op.nodeId, op.newParentId);
    return;
  }

  if (op.op === 'deleteNode') {
    return;
  }

  if (op.op === 'detachInstance') {
    const parentId = graph.parentById.get(op.nodeId);
    if (parentId === undefined || parentId === null) return;
    // Post-op node is FRAME in working; graph.nodes may still hold stale INSTANCE.
    const frame = findEnvelopeNode(working, op.nodeId);
    if (!frame || frame.type !== 'FRAME') return;
    unindexNodeById(graph, op.nodeId);
    indexSceneNode(graph, frame, parentId, working);
  }
}

/** After deleteNode: remove pre-collected ids from the graph index. */
export function applyIndexAfterDeleteOp(graph: GraphIndexes, ids: string[]): void {
  for (const id of ids) unindexNodeById(graph, id);
}

/** Collect ids to unindex before applying deleteNode. */
export function collectDeleteUnindexIdsForOp(
  working: FileEnvelope,
  op: Extract<SceneGraphOperation, { op: 'deleteNode' }>
): string[] {
  return collectDeleteUnindexIds(working, op.nodeId);
}
