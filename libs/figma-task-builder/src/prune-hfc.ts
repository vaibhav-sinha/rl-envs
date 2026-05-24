/**
 * Prune HFC envelope nodes by sourceFigmaId. Mirrors
 * headless-figma-clone/src/import/pruneBySourceFigmaId.ts
 */

const COMPONENT_MASTERS_PAGE_NAME = '__Component Masters';

interface HfcNode {
  id: string;
  type: string;
  name?: string;
  sourceFigmaId?: string;
  rootFrameId?: string;
  mainComponentId?: string;
  componentIds?: string[];
  children?: HfcNode[];
}

interface HfcEnvelope {
  document: { children: Array<{ name?: string; children: HfcNode[] }> };
}

interface ExclusionClosure {
  sourceFigmaIds: Set<string>;
  internalIds: Set<string>;
}

function hasChildren(node: HfcNode): node is HfcNode & { children: HfcNode[] } {
  return Array.isArray(node.children);
}

function indexEnvelopeNodes(envelope: HfcEnvelope): {
  byId: Map<string, HfcNode>;
  bySourceFigmaId: Map<string, HfcNode[]>;
} {
  const byId = new Map<string, HfcNode>();
  const bySourceFigmaId = new Map<string, HfcNode[]>();

  function walk(nodes: HfcNode[]): void {
    for (const node of nodes) {
      byId.set(node.id, node);
      if (node.sourceFigmaId) {
        const list = bySourceFigmaId.get(node.sourceFigmaId) ?? [];
        list.push(node);
        bySourceFigmaId.set(node.sourceFigmaId, list);
      }
      if (hasChildren(node)) walk(node.children);
    }
  }

  for (const page of envelope.document.children) {
    walk(page.children);
  }

  return { byId, bySourceFigmaId };
}

function registerExcludedComponent(comp: HfcNode, closure: ExclusionClosure): void {
  closure.internalIds.add(comp.id);
  if (comp.rootFrameId) closure.internalIds.add(comp.rootFrameId);
  if (comp.sourceFigmaId) closure.sourceFigmaIds.add(comp.sourceFigmaId);
}

function registerExcludedComponentSet(
  set: HfcNode,
  byId: Map<string, HfcNode>,
  closure: ExclusionClosure
): void {
  closure.internalIds.add(set.id);
  if (set.sourceFigmaId) closure.sourceFigmaIds.add(set.sourceFigmaId);

  for (const variantId of set.componentIds ?? []) {
    closure.internalIds.add(variantId);
    const variant = byId.get(variantId);
    if (variant?.type === 'COMPONENT') {
      registerExcludedComponent(variant, closure);
    }
  }
}

function buildExclusionClosure(envelope: HfcEnvelope, excludeFigmaIds: string[]): ExclusionClosure {
  const closure: ExclusionClosure = {
    sourceFigmaIds: new Set(excludeFigmaIds),
    internalIds: new Set<string>(),
  };

  const { byId, bySourceFigmaId } = indexEnvelopeNodes(envelope);
  const pending = [...excludeFigmaIds];
  const processedSources = new Set<string>();

  while (pending.length > 0) {
    const sourceId = pending.pop()!;
    if (processedSources.has(sourceId)) continue;
    processedSources.add(sourceId);

    for (const node of bySourceFigmaId.get(sourceId) ?? []) {
      if (node.type === 'COMPONENT_SET') {
        registerExcludedComponentSet(node, byId, closure);
        for (const variantId of node.componentIds ?? []) {
          const variant = byId.get(variantId);
          if (
            variant?.type === 'COMPONENT' &&
            variant.sourceFigmaId &&
            !processedSources.has(variant.sourceFigmaId)
          ) {
            pending.push(variant.sourceFigmaId);
          }
        }
      } else if (node.type === 'COMPONENT') {
        registerExcludedComponent(node, closure);
      }
    }
  }

  return closure;
}

function shouldRemoveSceneNode(node: HfcNode, closure: ExclusionClosure): boolean {
  if (node.sourceFigmaId && closure.sourceFigmaIds.has(node.sourceFigmaId)) return true;
  if (closure.internalIds.has(node.id)) return true;
  if (node.type === 'INSTANCE' && node.mainComponentId && closure.internalIds.has(node.mainComponentId)) {
    return true;
  }
  return false;
}

function pruneSceneChildren(children: HfcNode[], closure: ExclusionClosure): HfcNode[] {
  const kept: HfcNode[] = [];
  for (const child of children) {
    if (shouldRemoveSceneNode(child, closure)) continue;
    if (hasChildren(child)) {
      child.children = pruneSceneChildren(child.children, closure);
    }
    kept.push(child);
  }
  return kept;
}

function patchSurvivingComponentSets(envelope: HfcEnvelope): void {
  const { byId } = indexEnvelopeNodes(envelope);

  function walk(nodes: HfcNode[]): void {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]!;
      if (node.type === 'COMPONENT_SET' && node.componentIds) {
        const keptIds = node.componentIds.filter((cid) => byId.has(cid));
        if (keptIds.length === 0) {
          nodes.splice(i, 1);
        } else if (keptIds.length !== node.componentIds.length) {
          node.componentIds = keptIds;
        }
      }
      if (hasChildren(node)) walk(node.children);
    }
  }

  for (const page of envelope.document.children) {
    walk(page.children);
  }
}

export function pruneEnvelopeBySourceFigmaIds<T extends HfcEnvelope>(
  envelope: T,
  excludeFigmaIds: string[]
): T {
  if (excludeFigmaIds.length === 0) return envelope;

  const closure = buildExclusionClosure(envelope, excludeFigmaIds);
  const pruned = structuredClone(envelope) as T;

  for (const page of pruned.document.children) {
    page.children = pruneSceneChildren(page.children, closure);
  }

  const mastersPage = pruned.document.children.find((p) => p.name === COMPONENT_MASTERS_PAGE_NAME);
  if (mastersPage) {
    mastersPage.children = mastersPage.children.filter((n) => !closure.internalIds.has(n.id));
  }

  patchSurvivingComponentSets(pruned);

  return pruned;
}

export function envelopeHasSourceFigmaIds(envelope: HfcEnvelope): boolean {
  function walk(nodes: HfcNode[]): boolean {
    for (const n of nodes) {
      if (n.sourceFigmaId) return true;
      if (hasChildren(n) && walk(n.children)) return true;
    }
    return false;
  }
  for (const page of envelope.document.children) {
    if (walk(page.children)) return true;
  }
  return false;
}
