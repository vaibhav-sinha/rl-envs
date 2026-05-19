import { COMPONENT_MASTERS_PAGE_NAME } from '../persistence/componentGraphNormalize.js';
import type { FileEnvelope, SceneNode } from '../model/types.js';

function hasChildren(node: SceneNode): node is SceneNode & { children: SceneNode[] } {
  return 'children' in node && Array.isArray((node as { children?: unknown }).children);
}

function pruneSceneChildren(children: SceneNode[], exclude: Set<string>): SceneNode[] {
  const kept: SceneNode[] = [];
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
  children: SceneNode[],
  exclude: Set<string>,
  out: Set<string>
): void {
  for (const child of children) {
    if (child.sourceFigmaId && exclude.has(child.sourceFigmaId)) {
      if (child.type === 'COMPONENT' && 'rootFrameId' in child && typeof child.rootFrameId === 'string') {
        out.add(child.rootFrameId);
      }
      continue;
    }
    if (hasChildren(child)) {
      collectRemovedComponentRootFrameIds(child.children, exclude, out);
    }
  }
}

/**
 * Remove nodes (and their subtrees) whose `sourceFigmaId` matches any id in `excludeFigmaIds`.
 * Also removes component master root frames when a COMPONENT node is excluded.
 */
export function pruneEnvelopeBySourceFigmaIds(
  envelope: FileEnvelope,
  excludeFigmaIds: string[]
): FileEnvelope {
  if (excludeFigmaIds.length === 0) return envelope;

  const exclude = new Set(excludeFigmaIds);
  const pruned = structuredClone(envelope);

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

/** True if any node in the document tree has sourceFigmaId set. */
export function envelopeHasSourceFigmaIds(envelope: FileEnvelope): boolean {
  function walk(nodes: SceneNode[]): boolean {
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
