/**
 * Prune HFC envelope nodes by sourceFigmaId. Mirrors
 * headless-figma-clone/src/import/pruneBySourceFigmaId.ts
 */

const COMPONENT_MASTERS_PAGE_NAME = '__hfc:component-masters-page';

interface HfcNode {
  id: string;
  type: string;
  name?: string;
  sourceFigmaId?: string;
  rootFrameId?: string;
  children?: HfcNode[];
}

interface HfcEnvelope {
  document: { children: Array<{ name?: string; children: HfcNode[] }> };
}

function hasChildren(node: HfcNode): node is HfcNode & { children: HfcNode[] } {
  return Array.isArray(node.children);
}

function pruneSceneChildren(children: HfcNode[], exclude: Set<string>): HfcNode[] {
  const kept: HfcNode[] = [];
  for (const child of children) {
    if (child.sourceFigmaId && exclude.has(child.sourceFigmaId)) {
      continue;
    }
    if (hasChildren(child)) {
      child.children = pruneSceneChildren(child.children, exclude);
    }
    kept.push(child);
  }
  return kept;
}

function collectRemovedComponentRootFrameIds(
  children: HfcNode[],
  exclude: Set<string>,
  out: Set<string>
): void {
  for (const child of children) {
    if (child.sourceFigmaId && exclude.has(child.sourceFigmaId)) {
      if (child.type === 'COMPONENT' && typeof child.rootFrameId === 'string') {
        out.add(child.rootFrameId);
      }
      continue;
    }
    if (hasChildren(child)) {
      collectRemovedComponentRootFrameIds(child.children, exclude, out);
    }
  }
}

export function pruneEnvelopeBySourceFigmaIds<T extends HfcEnvelope>(
  envelope: T,
  excludeFigmaIds: string[]
): T {
  if (excludeFigmaIds.length === 0) return envelope;

  const exclude = new Set(excludeFigmaIds);
  const pruned = structuredClone(envelope) as T;

  const removedRootFrameIds = new Set<string>();
  for (const page of pruned.document.children) {
    collectRemovedComponentRootFrameIds(page.children, exclude, removedRootFrameIds);
    page.children = pruneSceneChildren(page.children, exclude);
  }

  if (removedRootFrameIds.size > 0) {
    const mastersPage = pruned.document.children.find((p) => p.name === COMPONENT_MASTERS_PAGE_NAME);
    if (mastersPage) {
      mastersPage.children = mastersPage.children.filter((n) => !removedRootFrameIds.has(n.id));
    }
  }

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
