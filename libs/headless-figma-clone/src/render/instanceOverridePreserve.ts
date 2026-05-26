/**
 * Preserve layer edits on INSTANCE detached children across variant rematerialization.
 */
import type {
  ComponentOverrideFields,
  ComponentPropertyValue,
  FrameNode,
  InstanceNode,
  SceneNode,
} from '../model/types.js';
import { applyOverrideFieldsToNode } from './instanceOverrideApply.js';

function walkDetachedSceneNodes(nodes: SceneNode[], out: Map<string, SceneNode>): void {
  for (const node of nodes) {
    out.set(node.id, node);
    if (
      node.type === 'FRAME' ||
      node.type === 'TRANSFORM_GROUP' ||
      node.type === 'GROUP' ||
      node.type === 'SECTION'
    ) {
      walkDetachedSceneNodes(node.children, out);
    } else if (node.type === 'BOOLEAN_OPERATION') {
      walkDetachedSceneNodes(node.children as unknown as SceneNode[], out);
    } else if (node.type === 'INSTANCE' && node.children?.length) {
      walkDetachedSceneNodes(node.children, out);
    }
  }
}

/** Index every node in an instance's detached subtree by id. */
export function buildDetachedSubtreeNodeMap(inst: InstanceNode): Map<string, SceneNode> {
  const out = new Map<string, SceneNode>();
  if (inst.children?.length) {
    walkDetachedSceneNodes(inst.children, out);
  }
  return out;
}

/** Extract override-relevant fields from a detached subtree node. */
export function extractPreservableOverrideFields(node: SceneNode): ComponentOverrideFields | undefined {
  const patch: ComponentOverrideFields = {};

  if (node.visible !== undefined) patch.visible = node.visible;
  if (node.opacity !== undefined) patch.opacity = node.opacity;
  if (node.blendMode !== undefined) patch.blendMode = node.blendMode;
  if ('rotation' in node && node.rotation !== undefined) patch.rotation = node.rotation;

  if ('fills' in node && node.fills !== undefined) {
    patch.fills = structuredClone(node.fills);
  }
  if ('strokes' in node && node.strokes !== undefined) {
    patch.strokes = structuredClone(node.strokes);
  }
  if ('effects' in node && node.effects !== undefined) {
    patch.effects = structuredClone(node.effects);
  }

  if (node.type === 'TEXT') {
    patch.characters = node.characters;
    if (node.fontSize !== undefined) patch.fontSize = node.fontSize;
    if (node.fontWeight !== undefined) patch.fontWeight = node.fontWeight;
    if (node.fontName !== undefined) patch.fontName = { ...node.fontName };
    if (node.textAlignHorizontal !== undefined) patch.textAlignHorizontal = node.textAlignHorizontal;
    if (node.textAlignVertical !== undefined) patch.textAlignVertical = node.textAlignVertical;
    if (node.textAutoResize !== undefined) patch.textAutoResize = node.textAutoResize;
    if (node.textTruncation !== undefined) patch.textTruncation = node.textTruncation;
    if (node.maxLines !== undefined) patch.maxLines = node.maxLines;
    if (node.lineHeight !== undefined) patch.lineHeight = node.lineHeight;
    if (node.letterSpacing !== undefined) patch.letterSpacing = node.letterSpacing;
    if (node.leadingTrim !== undefined) patch.leadingTrim = node.leadingTrim;
    if (node.paragraphSpacing !== undefined) patch.paragraphSpacing = node.paragraphSpacing;
    if (node.textCase !== undefined) patch.textCase = node.textCase;
    if (node.textDecoration !== undefined) patch.textDecoration = node.textDecoration;
    if (node.textStyleId !== undefined) patch.textStyleId = node.textStyleId;
    if (node.styledSegments !== undefined) patch.styledSegments = structuredClone(node.styledSegments);
  }

  if (node.type === 'FRAME') {
    if (node.layoutMode !== undefined) patch.layoutMode = node.layoutMode;
    if (node.paddingLeft !== undefined) patch.paddingLeft = node.paddingLeft;
    if (node.paddingRight !== undefined) patch.paddingRight = node.paddingRight;
    if (node.paddingTop !== undefined) patch.paddingTop = node.paddingTop;
    if (node.paddingBottom !== undefined) patch.paddingBottom = node.paddingBottom;
    if (node.itemSpacing !== undefined) patch.itemSpacing = node.itemSpacing;
    if (node.primaryAxisAlignItems !== undefined) patch.primaryAxisAlignItems = node.primaryAxisAlignItems;
    if (node.counterAxisAlignItems !== undefined) patch.counterAxisAlignItems = node.counterAxisAlignItems;
    if (node.layoutSizingHorizontal !== undefined) patch.layoutSizingHorizontal = node.layoutSizingHorizontal;
    if (node.layoutSizingVertical !== undefined) patch.layoutSizingVertical = node.layoutSizingVertical;
    if (node.layoutAlign !== undefined) patch.layoutAlign = node.layoutAlign;
    if (node.layoutGrow !== undefined) patch.layoutGrow = node.layoutGrow;
    if (node.layoutPositioning !== undefined) patch.layoutPositioning = node.layoutPositioning;
    if (node.clipsContent !== undefined) patch.clipsContent = node.clipsContent;
    if (node.cornerRadius !== undefined) patch.cornerRadius = node.cornerRadius;
    if (node.strokeWeight !== undefined) patch.strokeWeight = node.strokeWeight;
    if (node.strokeAlign !== undefined) patch.strokeAlign = node.strokeAlign;
    if (node.individualStrokeWeights !== undefined) {
      patch.individualStrokeWeights = { ...node.individualStrokeWeights };
    }
    if (node.backgrounds !== undefined) {
      patch.backgrounds = structuredClone(node.backgrounds);
    }
  }

  if ('layoutSizingHorizontal' in node && node.layoutSizingHorizontal !== undefined) {
    patch.layoutSizingHorizontal = node.layoutSizingHorizontal;
  }
  if ('layoutSizingVertical' in node && node.layoutSizingVertical !== undefined) {
    patch.layoutSizingVertical = node.layoutSizingVertical;
  }
  if ('layoutAlign' in node && node.layoutAlign !== undefined) {
    patch.layoutAlign = node.layoutAlign;
  }
  if ('layoutGrow' in node && node.layoutGrow !== undefined) {
    patch.layoutGrow = node.layoutGrow;
  }
  if ('layoutPositioning' in node && node.layoutPositioning !== undefined) {
    patch.layoutPositioning = node.layoutPositioning;
  }
  if ('strokeWeight' in node && node.strokeWeight !== undefined) {
    patch.strokeWeight = node.strokeWeight;
  }
  if ('individualStrokeWeights' in node && node.individualStrokeWeights !== undefined) {
    patch.individualStrokeWeights = { ...node.individualStrokeWeights };
  }
  if ('cornerRadius' in node && node.cornerRadius !== undefined) {
    patch.cornerRadius = node.cornerRadius;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
}

/** Copy preservable fields from `source` onto `target` (same type required). */
export function applyPreservableOverrideFields(target: SceneNode, source: SceneNode): void {
  if (target.type !== source.type) return;

  const patch = extractPreservableOverrideFields(source);
  if (patch) {
    applyOverrideFieldsToNode(target, patch);
  }

  if (target.type === 'INSTANCE' && source.type === 'INSTANCE' && source.componentProperties) {
    target.componentProperties = structuredClone(
      source.componentProperties
    ) as Record<string, ComponentPropertyValue>;
  }
}

function collectSceneNodesPreorder(roots: SceneNode[]): SceneNode[] {
  const out: SceneNode[] = [];
  const stack = [...roots].reverse();
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n);
    if (
      n.type === 'FRAME' ||
      n.type === 'TRANSFORM_GROUP' ||
      n.type === 'GROUP' ||
      n.type === 'SECTION'
    ) {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
    } else if (n.type === 'BOOLEAN_OPERATION') {
      const ch = n.children as unknown as SceneNode[];
      for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]!);
    } else if (n.type === 'INSTANCE' && n.children?.length) {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
    }
  }
  return out;
}

/** Map detached node id → corresponding node in the previous variant master (preorder + type). */
export function buildDetachedToMasterNodeMap(
  detachedRoots: SceneNode[],
  masterRoot: FrameNode
): Map<string, SceneNode | undefined> {
  const detachedList = collectSceneNodesPreorder(detachedRoots);
  const masterList = collectSceneNodesPreorder([masterRoot]);
  const out = new Map<string, SceneNode | undefined>();
  let mi = 0;
  for (const d of detachedList) {
    while (mi < masterList.length && masterList[mi]!.type !== d.type) {
      mi += 1;
    }
    const m =
      mi < masterList.length && masterList[mi]!.type === d.type ? masterList[mi] : undefined;
    if (m) mi += 1;
    out.set(d.id, m);
  }
  return out;
}

/** Fields on `node` that differ from the previous variant master (user edits only). */
export function diffPreservableOverrideFields(
  node: SceneNode,
  masterNode: SceneNode | undefined
): ComponentOverrideFields | undefined {
  const patch = extractPreservableOverrideFields(node);
  if (!patch) return undefined;
  if (!masterNode || masterNode.type !== node.type) return patch;

  if (node.type === 'TEXT' && masterNode.type === 'TEXT') {
    if (patch.characters !== undefined && patch.characters === masterNode.characters) {
      delete patch.characters;
    }
    if (patch.fontSize !== undefined && patch.fontSize === masterNode.fontSize) {
      delete patch.fontSize;
    }
    if (patch.fontWeight !== undefined && patch.fontWeight === masterNode.fontWeight) {
      delete patch.fontWeight;
    }
  }

  if (node.type === 'INSTANCE' && masterNode.type === 'INSTANCE' && patch) {
    const sameProps =
      JSON.stringify(node.componentProperties ?? {}) ===
      JSON.stringify(masterNode.componentProperties ?? {});
    if (sameProps) {
      return undefined;
    }
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
}

/**
 * After variant rematerialization, re-apply user edits from the pre-swap detached subtree.
 * Matches by preserved node id first, then by layer type + name when structure shifts.
 */
export function mergePreservedFieldsFromSnapshot(
  inst: InstanceNode,
  oldNodesById: Map<string, SceneNode>,
  detachedToMaster: Map<string, SceneNode | undefined>
): void {
  if (!inst.children?.length || oldNodesById.size === 0) return;

  const newNodesById = buildDetachedSubtreeNodeMap(inst);
  const usedNewIds = new Set<string>();

  const applyUserEdits = (target: SceneNode, oldNode: SceneNode): void => {
    const masterNode = detachedToMaster.get(oldNode.id);
    const patch = diffPreservableOverrideFields(oldNode, masterNode);
    const propsDiffer =
      oldNode.type === 'INSTANCE' &&
      target.type === 'INSTANCE' &&
      masterNode?.type === 'INSTANCE' &&
      JSON.stringify(oldNode.componentProperties ?? {}) !==
        JSON.stringify(masterNode.componentProperties ?? {});
    if (!patch && !propsDiffer) return;
    if (patch) applyOverrideFieldsToNode(target, patch);
    if (propsDiffer && oldNode.type === 'INSTANCE' && target.type === 'INSTANCE') {
      target.componentProperties = structuredClone(
        oldNode.componentProperties
      ) as Record<string, ComponentPropertyValue>;
    }
  };

  for (const [oldId, oldNode] of oldNodesById) {
    const patch = diffPreservableOverrideFields(oldNode, detachedToMaster.get(oldId));
    if (!patch) continue;

    const byId = newNodesById.get(oldId);
    if (byId && byId.type === oldNode.type && !usedNewIds.has(byId.id)) {
      applyUserEdits(byId, oldNode);
      usedNewIds.add(byId.id);
      continue;
    }

    if (oldNode.type === 'TEXT') {
      const candidate = [...newNodesById.values()].find(
        (n) =>
          n.type === 'TEXT' &&
          !usedNewIds.has(n.id) &&
          (n.name === oldNode.name || oldNode.name === 'Label')
      );
      if (candidate) {
        applyUserEdits(candidate, oldNode);
        usedNewIds.add(candidate.id);
      }
      continue;
    }

    if (oldNode.type === 'INSTANCE') {
      const candidate = [...newNodesById.values()].find(
        (n) => n.type === 'INSTANCE' && !usedNewIds.has(n.id) && n.name === oldNode.name
      );
      if (candidate) {
        applyUserEdits(candidate, oldNode);
        usedNewIds.add(candidate.id);
      }
    }
  }
}

/** Sync detached subtree layer state into `inst.overrides` for compiler parity. */
export function mergeDetachedEditsIntoInstanceOverrides(inst: InstanceNode): void {
  if (!inst.children?.length) return;

  const map = buildDetachedSubtreeNodeMap(inst);
  let overrides = inst.overrides ? { ...inst.overrides } : undefined;

  for (const [nodeId, node] of map) {
    const patch = extractPreservableOverrideFields(node);
    if (!patch) continue;
    overrides = overrides ?? {};
    overrides[nodeId] = { ...(overrides[nodeId] ?? {}), ...patch };
  }

  inst.overrides = overrides;
}
