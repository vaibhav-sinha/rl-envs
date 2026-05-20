import type { AnyTreeNode } from './DocumentEngine.js';
import type { ComponentDefinition, FileEnvelope, SceneNode } from '../model/types.js';

export type NodeIndex = ReadonlyMap<string, AnyTreeNode>;

function indexSceneList(nodes: SceneNode[], index: Map<string, AnyTreeNode>): void {
  for (const n of nodes) {
    index.set(n.id, n);
    if (
      n.type === 'FRAME' ||
      n.type === 'TRANSFORM_GROUP' ||
      n.type === 'GROUP' ||
      n.type === 'SECTION'
    ) {
      indexSceneList(n.children, index);
    } else if (n.type === 'BOOLEAN_OPERATION') {
      indexSceneList(n.children as unknown as SceneNode[], index);
    } else if (n.type === 'INSTANCE' && n.children?.length) {
      indexSceneList(n.children, index);
    }
  }
}

function indexComponentDefinition(def: ComponentDefinition, index: Map<string, AnyTreeNode>): void {
  index.set(def.id, {
    id: def.id,
    type: 'COMPONENT',
    name: def.name,
    x: 0,
    y: 0,
    width: def.root.width,
    height: def.root.height,
    rootFrameId: def.root.id,
  } as AnyTreeNode);
  index.set(def.root.id, def.root);
  indexSceneList(def.root.children, index);
}

/** O(n) once — id → node for document tree, instance children, and legacy component masters. */
export function buildNodeIndex(working: FileEnvelope): NodeIndex {
  const index = new Map<string, AnyTreeNode>();
  const doc = working.document;
  index.set(doc.id, doc);
  for (const page of doc.children) {
    index.set(page.id, page);
    indexSceneList(page.children, index);
  }
  for (const def of working.components ?? []) {
    indexComponentDefinition(def, index);
  }
  return index;
}
