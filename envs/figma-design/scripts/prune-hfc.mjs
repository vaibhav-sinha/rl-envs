/**
 * Prune HFC envelope nodes by sourceFigmaId.
 * Mirrors libs/figma-task-builder/src/prune-hfc.ts
 */

const COMPONENT_MASTERS_PAGE_NAME = '__hfc:component-masters-page';

function hasChildren(node) {
  return Array.isArray(node.children);
}

function pruneSceneChildren(children, exclude) {
  const kept = [];
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

function collectRemovedComponentRootFrameIds(children, exclude, out) {
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

export function pruneEnvelopeBySourceFigmaIds(envelope, excludeFigmaIds) {
  if (!excludeFigmaIds?.length) return envelope;

  const exclude = new Set(excludeFigmaIds);
  const pruned = structuredClone(envelope);

  const removedRootFrameIds = new Set();
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
