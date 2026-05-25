import type { AnyTreeNode } from './DocumentEngine.js';
import { findEnvelopeNode } from './DocumentEngine.js';
import type {
  ComponentDefinition,
  ComponentNode,
  ComponentSetNode,
  FileEnvelope,
  SceneNode,
} from '../model/types.js';

export type NodeIndex = ReadonlyMap<string, AnyTreeNode>;
export type ParentById = ReadonlyMap<string, string | null>;
export type ComponentSetByComponentId = ReadonlyMap<string, string>;

export interface GraphIndexes {
  nodes: NodeIndex;
  parentById: ParentById;
  componentSetByComponentId: ComponentSetByComponentId;
}

interface IndexMaps {
  index: Map<string, AnyTreeNode>;
  parentById: Map<string, string | null>;
  componentSetByComponentId: Map<string, string>;
}

function registerComponentSet(set: ComponentSetNode, parentId: string, maps: IndexMaps): void {
  maps.index.set(set.id, set);
  maps.parentById.set(set.id, parentId);
  for (const cid of set.componentIds) {
    maps.componentSetByComponentId.set(cid, set.id);
  }
}

function indexComponentRootFrame(
  comp: ComponentNode,
  _parentId: string,
  maps: IndexMaps,
  working: FileEnvelope
): void {
  const frame = findEnvelopeNode(working, comp.rootFrameId, maps.index);
  if (!frame || frame.type !== 'FRAME') return;
  maps.index.set(frame.id, frame);
  maps.parentById.set(frame.id, comp.id);
  indexSceneNodes(frame.children, frame.id, maps, working);
}

function indexSceneNodes(
  nodes: SceneNode[],
  parentId: string,
  maps: IndexMaps,
  working: FileEnvelope
): void {
  for (const n of nodes) {
    maps.index.set(n.id, n);
    maps.parentById.set(n.id, parentId);

    if (n.type === 'COMPONENT_SET') {
      registerComponentSet(n, parentId, maps);
      continue;
    }
    if (n.type === 'COMPONENT') {
      indexComponentRootFrame(n, n.id, maps, working);
      continue;
    }
    if (
      n.type === 'FRAME' ||
      n.type === 'TRANSFORM_GROUP' ||
      n.type === 'GROUP' ||
      n.type === 'SECTION'
    ) {
      indexSceneNodes(n.children, n.id, maps, working);
    } else if (n.type === 'BOOLEAN_OPERATION') {
      indexSceneNodes(n.children as unknown as SceneNode[], n.id, maps, working);
    } else if (n.type === 'INSTANCE' && n.children?.length) {
      indexSceneNodes(n.children, n.id, maps, working);
    }
  }
}

function indexComponentDefinition(def: ComponentDefinition, maps: IndexMaps, working: FileEnvelope): void {
  const compStub = {
    id: def.id,
    type: 'COMPONENT' as const,
    name: def.name,
    x: 0,
    y: 0,
    width: def.root.width,
    height: def.root.height,
    rootFrameId: def.root.id,
  };
  maps.index.set(def.id, compStub as AnyTreeNode);
  maps.parentById.set(def.id, null);
  maps.index.set(def.root.id, def.root);
  maps.parentById.set(def.root.id, def.id);
  indexSceneNodes(def.root.children, def.root.id, maps, working);
}

/** O(n) once — id → node, parent id, and variant component → component set. */
export function buildGraphIndexes(working: FileEnvelope): GraphIndexes {
  const maps: IndexMaps = {
    index: new Map<string, AnyTreeNode>(),
    parentById: new Map<string, string | null>(),
    componentSetByComponentId: new Map<string, string>(),
  };
  const doc = working.document;
  maps.index.set(doc.id, doc);
  for (const page of doc.children) {
    maps.index.set(page.id, page);
    maps.parentById.set(page.id, doc.id);
    indexSceneNodes(page.children, page.id, maps, working);
    // COMPONENT_SET nodes may reference variants not nested under the set in the scene tree
    for (const ch of page.children) {
      if (ch.type === 'COMPONENT_SET') {
        for (const cid of ch.componentIds) {
          if (!maps.index.has(cid)) {
            const comp = findEnvelopeNode(working, cid, maps.index);
            if (comp) {
              maps.index.set(comp.id, comp);
              maps.parentById.set(comp.id, ch.id);
              if (comp.type === 'COMPONENT') {
                indexComponentRootFrame(comp, ch.id, maps, working);
              }
            }
          }
        }
      }
    }
  }
  for (const def of working.components ?? []) {
    indexComponentDefinition(def, maps, working);
  }
  return {
    nodes: maps.index,
    parentById: maps.parentById,
    componentSetByComponentId: maps.componentSetByComponentId,
  };
}

/** @deprecated Prefer {@link buildGraphIndexes} when parent or component-set maps are needed. */
export function buildNodeIndex(working: FileEnvelope): NodeIndex {
  return buildGraphIndexes(working).nodes;
}

export function resolveParentNode(
  graph: GraphIndexes,
  nodeId: string
): AnyTreeNode | null {
  const parentId = graph.parentById.get(nodeId);
  if (parentId === undefined || parentId === null) return null;
  return graph.nodes.get(parentId) ?? null;
}

export function findComponentSetForComponent(
  graph: GraphIndexes,
  componentId: string
): ComponentSetNode | null {
  const setId = graph.componentSetByComponentId.get(componentId);
  if (!setId) return null;
  const set = graph.nodes.get(setId);
  return set?.type === 'COMPONENT_SET' ? (set as ComponentSetNode) : null;
}

const envelopeGraphByEnvelope = new WeakMap<FileEnvelope, GraphIndexes>();

/** Lazily-built graph indexes for an envelope; kept current via incremental op updates. */
export function getEnvelopeGraphIndexes(working: FileEnvelope): GraphIndexes {
  let graph = envelopeGraphByEnvelope.get(working);
  if (!graph) {
    graph = buildGraphIndexes(working);
    envelopeGraphByEnvelope.set(working, graph);
  }
  return graph;
}

/** Prefer op-scoped indexes (batched replay); fall back to the envelope's shared graph. */
export function graphIndexesForOp(
  working: FileEnvelope,
  ctx?: { indexes?: GraphIndexes }
): GraphIndexes {
  return ctx?.indexes ?? getEnvelopeGraphIndexes(working);
}
