import type {
  ComponentDefinition,
  DocumentNode,
  FileEnvelope,
  PageNode,
  SceneNode,
} from '../model/types.js';

/** Internal page holding component master root frames (not used for default compile). */
export const COMPONENT_MASTERS_PAGE_NAME = '__Component Masters';

/** Scene nodes that indicate a graph-native component model (not legacy sidecar-only). */
const GRAPH_NATIVE_COMPONENT_TYPES = new Set(['COMPONENT', 'COMPONENT_SET', 'INSTANCE']);

function walkScene(nodes: SceneNode[], visit: (node: SceneNode) => void): void {
  for (const node of nodes) {
    visit(node);
    if (
      node.type === 'FRAME' ||
      node.type === 'TRANSFORM_GROUP' ||
      node.type === 'GROUP' ||
      node.type === 'SECTION' ||
      node.type === 'BOOLEAN_OPERATION'
    ) {
      const kids =
        node.type === 'BOOLEAN_OPERATION'
          ? (node.children as unknown as SceneNode[])
          : node.children;
      walkScene(kids, visit);
    }
  }
}

export function documentHasGraphComponents(document: DocumentNode): boolean {
  let found = false;
  for (const page of document.children) {
    walkScene(page.children as SceneNode[], (node) => {
      if (GRAPH_NATIVE_COMPONENT_TYPES.has(node.type)) found = true;
    });
    if (found) return true;
  }
  return false;
}

export function nodeExistsInDocument(document: DocumentNode, nodeId: string): boolean {
  for (const page of document.children) {
    if (page.id === nodeId) return true;
    let hit = false;
    walkScene(page.children as SceneNode[], (node) => {
      if (node.id === nodeId) hit = true;
    });
    if (hit) return true;
  }
  return false;
}

function bumpNextInternalIdFromDocument(env: FileEnvelope): void {
  let maxIdNum = 0;
  const scan = (nodes: SceneNode[]): void => {
    for (const n of nodes) {
      if (typeof n.id === 'string') {
        const m = n.id.match(/^I(\d+)$/);
        if (m) maxIdNum = Math.max(maxIdNum, Number(m[1]!));
      }
      if (
        n.type === 'FRAME' ||
        n.type === 'TRANSFORM_GROUP' ||
        n.type === 'GROUP' ||
        n.type === 'SECTION' ||
        n.type === 'BOOLEAN_OPERATION'
      ) {
        const kids =
          n.type === 'BOOLEAN_OPERATION'
            ? (n.children as unknown as SceneNode[])
            : n.children;
        scan(kids);
      }
    }
  };
  for (const page of env.document.children) {
    const m = page.id.match(/^I(\d+)$/);
    if (m) maxIdNum = Math.max(maxIdNum, Number(m[1]!));
    scan(page.children as SceneNode[]);
  }
  if (maxIdNum + 1 > env.nextInternalId) env.nextInternalId = maxIdNum + 1;
}

function allocateInternalId(env: FileEnvelope): string {
  const id = `I${env.nextInternalId}`;
  env.nextInternalId += 1;
  return id;
}

export function ensureComponentMastersPage(env: FileEnvelope): PageNode {
  const existing = env.document.children.find((p) => p.name === COMPONENT_MASTERS_PAGE_NAME);
  if (existing) return existing;

  const page: PageNode = {
    id: allocateInternalId(env),
    type: 'PAGE',
    name: COMPONENT_MASTERS_PAGE_NAME,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    children: [],
  };
  env.document.children.push(page);
  return page;
}

function convertComponentInstances(nodes: unknown[]): void {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i] as SceneNode;
    if (n && typeof n === 'object' && n.type === 'COMPONENT_INSTANCE') {
      (nodes as SceneNode[])[i] = { ...n, type: 'INSTANCE' } as SceneNode;
    }
    if (n && typeof n === 'object' && 'children' in n && Array.isArray(n.children)) {
      convertComponentInstances(n.children as unknown[]);
    }
  }
}

function attachComponentLibrary(
  env: FileEnvelope,
  components: ComponentDefinition[],
  hasGraphComponents: boolean
): void {
  const mastersPage = ensureComponentMastersPage(env);

  for (const comp of components) {
    if (!nodeExistsInDocument(env.document, comp.root.id)) {
      mastersPage.children.push(comp.root);
    }

    // True legacy: masters only lived in components[] — add COMPONENT wrappers on the masters page.
    if (!hasGraphComponents && !nodeExistsInDocument(env.document, comp.id)) {
      mastersPage.children.push({
        id: comp.id,
        type: 'COMPONENT',
        name: comp.name,
        x: 0,
        y: 0,
        width: comp.root.width,
        height: comp.root.height,
        rootFrameId: comp.root.id,
      });
    }
  }
}

/**
 * Inline `components[]` master roots into the document graph and remove the sidecar.
 * Hybrid imports (graph nodes + components[]) only attach missing roots — no duplicate wrappers.
 */
export function componentIdExistsInEnvelope(env: FileEnvelope, componentId: string): boolean {
  if (env.components?.some((c) => c.id === componentId)) return true;
  for (const page of env.document.children) {
    let found = false;
    walkScene(page.children as SceneNode[], (node) => {
      if (node.id === componentId && node.type === 'COMPONENT') found = true;
    });
    if (found) return true;
  }
  return false;
}

export function normalizeComponentEnvelope(env: FileEnvelope): void {
  if (!env.components || env.components.length === 0) return;

  const hasGraph = documentHasGraphComponents(env.document);
  attachComponentLibrary(env, env.components, hasGraph);

  for (const page of env.document.children) {
    convertComponentInstances(page.children as unknown[]);
  }

  delete (env as { components?: ComponentDefinition[] }).components;
  bumpNextInternalIdFromDocument(env);
}
