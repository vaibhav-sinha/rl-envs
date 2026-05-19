const IMAGE_HASHES = new Set<string>();

function collectImageHashesFromValue(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value) collectImageHashesFromValue(v);
    return;
  }
  const o = value as Record<string, unknown>;
  if (o.type === 'IMAGE' && typeof o.imageHash === 'string') {
    IMAGE_HASHES.add(o.imageHash);
  }
  for (const v of Object.values(o)) collectImageHashesFromValue(v);
}

function tryCollectFillsImageHashes(node: BaseNode): void {
  try {
    if ('fills' in node && node.fills !== figma.mixed && Array.isArray(node.fills)) {
      collectImageHashesFromValue(node.fills);
    }
    if ('backgrounds' in node && Array.isArray((node as { backgrounds?: unknown }).backgrounds)) {
      collectImageHashesFromValue((node as { backgrounds: unknown }).backgrounds);
    }
  } catch {
    /* unreadable */
  }
}

function countNodesWalk(node: BaseNode, excludeIds: Set<string>, ancestorExcluded: boolean): number {
  const selfExcluded = ancestorExcluded || excludeIds.has(node.id);
  if (selfExcluded && node.type !== 'DOCUMENT') return 0;

  let n = 1;
  if ('children' in node && Array.isArray(node.children)) {
    for (const c of node.children) {
      n += countNodesWalk(c, excludeIds, selfExcluded);
    }
  }
  return n;
}

function collectRasterHashesWalk(node: BaseNode, excludeIds: Set<string>, ancestorExcluded: boolean): void {
  const selfExcluded = ancestorExcluded || excludeIds.has(node.id);
  if (selfExcluded && node.type !== 'DOCUMENT') return;

  tryCollectFillsImageHashes(node);
  if ('children' in node && Array.isArray(node.children)) {
    for (const c of node.children) {
      collectRasterHashesWalk(c, excludeIds, selfExcluded);
    }
  }
}

export interface ExportCountResult {
  nodes: number;
  rasterImages: number;
}

export function countExportTotals(excludeNodeIds?: string[]): ExportCountResult {
  IMAGE_HASHES.clear();
  const excludeIds = new Set(excludeNodeIds ?? []);
  const nodes = countNodesWalk(figma.root, excludeIds, false);
  collectRasterHashesWalk(figma.root, excludeIds, false);
  return {
    nodes,
    rasterImages: IMAGE_HASHES.size,
  };
}
