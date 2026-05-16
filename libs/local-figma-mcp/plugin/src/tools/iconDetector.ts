/**
 * Structural icon detector — kept in sync with headless-figma-clone/src/import/iconDetector.ts
 * (plugin has no package dependency on HFC).
 */

export interface SerializedNode {
  id: string;
  type: string;
  name: string;
  children?: SerializedNode[];
  properties: Record<string, unknown>;
}

const EXPORTABLE_CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'GROUP', 'INSTANCE', 'COMPONENT_SET']);

const VECTOR_TYPES = new Set(['VECTOR', 'LINE', 'ELLIPSE', 'POLYGON', 'STAR']);

const MAX_ICON_PX = 128;
const MIN_ICON_PX = 8;
const MAX_ASPECT = 3;

export interface IconTreeAnalysis {
  vectors: number;
  booleans: number;
  masks: number;
  texts: number;
  imageFills: number;
  rectangles: number;
  groups: number;
  frames: number;
  instances: number;
  hasMaskCluster: boolean;
  totalNodes: number;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function prop(node: SerializedNode, key: string): unknown {
  return node.properties[key];
}

function boundsFromSerializedNode(node: SerializedNode): { width: number; height: number } {
  const p = node.properties;
  const box = prop(node, 'absoluteBoundingBox') as { width?: number; height?: number } | undefined;
  const w = num(p.width) ?? num(box?.width) ?? 0;
  const h = num(p.height) ?? num(box?.height) ?? 0;
  return { width: w, height: h };
}

function childList(node: SerializedNode): SerializedNode[] {
  return node.children ?? [];
}

function hasMaskClusterInChildren(children: SerializedNode[]): boolean {
  for (let i = 0; i < children.length; i++) {
    if (prop(children[i]!, 'isMask') === true) {
      for (let j = i + 1; j < children.length; j++) {
        if (prop(children[j]!, 'isMask') !== true) return true;
      }
    }
  }
  return false;
}

export function analyzeIconSubtree(node: SerializedNode): IconTreeAnalysis {
  const out: IconTreeAnalysis = {
    vectors: 0,
    booleans: 0,
    masks: 0,
    texts: 0,
    imageFills: 0,
    rectangles: 0,
    groups: 0,
    frames: 0,
    instances: 0,
    hasMaskCluster: false,
    totalNodes: 0,
  };

  const stack: SerializedNode[] = [node];
  while (stack.length) {
    const cur = stack.pop()!;
    out.totalNodes += 1;

    if (cur.type === 'TEXT') out.texts += 1;
    if (VECTOR_TYPES.has(cur.type)) out.vectors += 1;
    if (cur.type === 'BOOLEAN_OPERATION') out.booleans += 1;
    if (prop(cur, 'isMask') === true) out.masks += 1;
    if (cur.type === 'RECTANGLE') out.rectangles += 1;
    if (cur.type === 'GROUP') out.groups += 1;
    if (cur.type === 'FRAME') out.frames += 1;
    if (cur.type === 'INSTANCE') out.instances += 1;

    const fills = prop(cur, 'fills');
    if (Array.isArray(fills)) {
      for (const f of fills) {
        if (f && typeof f === 'object' && (f as { type?: string }).type === 'IMAGE') {
          out.imageFills += 1;
        }
      }
    }

    const kids = childList(cur);
    if (hasMaskClusterInChildren(kids)) out.hasMaskCluster = true;
    for (const ch of kids) stack.push(ch);
  }

  return out;
}

export function isStructuralIconExportRoot(node: SerializedNode, analysis?: IconTreeAnalysis): boolean {
  if (!EXPORTABLE_CONTAINER_TYPES.has(node.type)) return false;

  const { width, height } = boundsFromSerializedNode(node);
  if (width < MIN_ICON_PX || height < MIN_ICON_PX) return false;
  if (width > MAX_ICON_PX || height > MAX_ICON_PX) return false;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  if (shortSide > 0 && longSide / shortSide > MAX_ASPECT) return false;

  const a = analysis ?? analyzeIconSubtree(node);
  const graphicLeaves = a.vectors + a.booleans;

  if (a.texts > 0) return false;

  if (a.hasMaskCluster) {
    if (graphicLeaves > 0) return true;
    if (a.masks >= 1 && a.rectangles >= 1) return true;
  }

  if (graphicLeaves === 0) return false;
  if (a.booleans > 0 && a.vectors > 0) return true;
  if (a.booleans > 0 && graphicLeaves >= 1) return true;

  if (a.vectors > 0 && a.booleans === 0 && !a.hasMaskCluster) {
    const structuralChildren = a.groups + a.frames + a.instances;
    if (structuralChildren <= 4) return true;
  }

  return false;
}

function buildParentMap(
  node: SerializedNode,
  parentId: string | null,
  out: Map<string, string | null>
): void {
  out.set(node.id, parentId);
  for (const ch of childList(node)) buildParentMap(ch, node.id, out);
}

function hasCandidateAncestor(
  nodeId: string,
  candidateIds: Set<string>,
  parentById: Map<string, string | null>
): boolean {
  let cur = parentById.get(nodeId) ?? null;
  while (cur) {
    if (candidateIds.has(cur)) return true;
    cur = parentById.get(cur) ?? null;
  }
  return false;
}

export function findStructuralIconExportRootIds(document: SerializedNode): string[] {
  const candidates: string[] = [];

  const walk = (node: SerializedNode): void => {
    if (isStructuralIconExportRoot(node)) candidates.push(node.id);
    for (const ch of childList(node)) walk(ch);
  };
  walk(document);

  if (candidates.length === 0) return [];

  const candidateSet = new Set(candidates);
  const parentById = new Map<string, string | null>();
  buildParentMap(document, null, parentById);

  return candidates.filter((id) => !hasCandidateAncestor(id, candidateSet, parentById));
}

export function tagSerializedIconSvgExport(
  root: SerializedNode,
  nodeId: string,
  assetKey: string
): void {
  if (root.id === nodeId) {
    root.properties = { ...root.properties, hfcIconSvgAsset: assetKey };
    return;
  }
  for (const ch of childList(root)) tagSerializedIconSvgExport(ch, nodeId, assetKey);
}
