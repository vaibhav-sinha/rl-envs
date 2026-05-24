import { COMPONENT_MASTERS_PAGE_NAME } from '../persistence/componentGraphNormalize.js';
import type {
  ComponentNode,
  ComponentSetNode,
  FileEnvelope,
  InstanceNode,
  SceneNode,
} from '../model/types.js';

function hasChildren(node: SceneNode): node is SceneNode & { children: SceneNode[] } {
  return 'children' in node && Array.isArray((node as { children?: unknown }).children);
}

interface ExclusionClosure {
  sourceFigmaIds: Set<string>;
  internalIds: Set<string>;
}

function indexEnvelopeNodes(envelope: FileEnvelope): {
  byId: Map<string, SceneNode>;
  bySourceFigmaId: Map<string, SceneNode[]>;
} {
  const byId = new Map<string, SceneNode>();
  const bySourceFigmaId = new Map<string, SceneNode[]>();

  function walk(nodes: SceneNode[]): void {
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

function registerExcludedComponent(
  comp: ComponentNode,
  closure: ExclusionClosure
): void {
  closure.internalIds.add(comp.id);
  if (comp.rootFrameId) closure.internalIds.add(comp.rootFrameId);
  if (comp.sourceFigmaId) closure.sourceFigmaIds.add(comp.sourceFigmaId);
}

function registerExcludedComponentSet(
  set: ComponentSetNode,
  byId: Map<string, SceneNode>,
  closure: ExclusionClosure
): void {
  closure.internalIds.add(set.id);
  if (set.sourceFigmaId) closure.sourceFigmaIds.add(set.sourceFigmaId);

  for (const variantId of set.componentIds) {
    closure.internalIds.add(variantId);
    const variant = byId.get(variantId);
    if (variant?.type === 'COMPONENT') {
      registerExcludedComponent(variant, closure);
    }
  }
}

function buildExclusionClosure(
  envelope: FileEnvelope,
  excludeFigmaIds: string[]
): ExclusionClosure {
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
        for (const variantId of node.componentIds) {
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

function shouldRemoveSceneNode(node: SceneNode, closure: ExclusionClosure): boolean {
  if (node.sourceFigmaId && closure.sourceFigmaIds.has(node.sourceFigmaId)) return true;
  if (closure.internalIds.has(node.id)) return true;
  if (node.type === 'INSTANCE') {
    const inst = node as InstanceNode;
    if (closure.internalIds.has(inst.mainComponentId)) return true;
  }
  return false;
}

function pruneSceneChildren(children: SceneNode[], closure: ExclusionClosure): SceneNode[] {
  const kept: SceneNode[] = [];
  for (const child of children) {
    if (shouldRemoveSceneNode(child, closure)) continue;
    if (hasChildren(child)) {
      child.children = pruneSceneChildren(child.children, closure);
    }
    kept.push(child);
  }
  return kept;
}

function patchSurvivingComponentSets(envelope: FileEnvelope): void {
  const { byId } = indexEnvelopeNodes(envelope);

  function walk(nodes: SceneNode[]): void {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]!;
      if (node.type === 'COMPONENT_SET') {
        const set = node as ComponentSetNode;
        const keptIds = set.componentIds.filter((cid) => byId.has(cid));
        if (keptIds.length === 0) {
          nodes.splice(i, 1);
        } else if (keptIds.length !== set.componentIds.length) {
          set.componentIds = keptIds;
        }
      }
      if (hasChildren(node)) walk(node.children);
    }
  }

  for (const page of envelope.document.children) {
    walk(page.children);
  }
}

/**
 * Remove nodes (and their subtrees) whose `sourceFigmaId` matches any id in `excludeFigmaIds`.
 * Excluding a COMPONENT_SET also removes all variant masters from `__Component Masters`,
 * related root frames, and instances referencing the set or any variant.
 */
export function pruneEnvelopeBySourceFigmaIds(
  envelope: FileEnvelope,
  excludeFigmaIds: string[]
): FileEnvelope {
  if (excludeFigmaIds.length === 0) return envelope;

  const closure = buildExclusionClosure(envelope, excludeFigmaIds);
  const pruned = structuredClone(envelope);

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
