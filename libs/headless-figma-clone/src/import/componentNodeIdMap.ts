import type { FrameNode, SceneNode } from '../model/types.js';

export interface PreorderSceneEntry {
  id: string;
  type: string;
}

/** Depth-first preorder of a component root frame (structure-stable across variants). */
export function preorderSceneEntries(root: FrameNode): PreorderSceneEntry[] {
  const out: PreorderSceneEntry[] = [];
  const stack: SceneNode[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    out.push({ id: n.id, type: n.type });
    if (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP' || n.type === 'SECTION') {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]!);
    } else if (n.type === 'BOOLEAN_OPERATION') {
      const ch = n.children as unknown as SceneNode[];
      for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]!);
    }
  }
  return out;
}

/**
 * Map base-variant stable node ids → corresponding ids in each variant root frame.
 * Matches {@link useFigmaScript} combineAsVariants preorder + type alignment.
 */
export function buildNodeIdMapByComponentId(
  componentRootFrames: Map<string, FrameNode>,
  componentIds: string[],
  baseComponentId?: string
): Record<string, Record<string, string>> | undefined {
  const baseId = baseComponentId ?? componentIds[0];
  if (!baseId) return undefined;
  const baseRoot = componentRootFrames.get(baseId);
  if (!baseRoot) return undefined;

  const baseList = preorderSceneEntries(baseRoot);
  const nodeIdMapByComponentId: Record<string, Record<string, string>> = {};

  for (const compId of componentIds) {
    const variantRoot = componentRootFrames.get(compId);
    if (!variantRoot) continue;
    const variantList = preorderSceneEntries(variantRoot);
    const map: Record<string, string> = {};
    const len = Math.min(baseList.length, variantList.length);
    for (let i = 0; i < len; i++) {
      if (baseList[i]!.type === variantList[i]!.type) {
        map[baseList[i]!.id] = variantList[i]!.id;
      }
    }
    if (Object.keys(map).length > 0) nodeIdMapByComponentId[compId] = map;
  }

  return Object.keys(nodeIdMapByComponentId).length > 0 ? nodeIdMapByComponentId : undefined;
}
