import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { AnyTreeNode, FileEnvelope, Paint, RGB } from '../model/types.js';
import type { DesignCatalog } from './catalog.js';
import { isMetadataOnlyChange } from './editGraph.js';
import type { EditGraph, SubCheckResult } from './types.js';
import { descendantIds, isInstanceNode } from './tree.js';

const NOVELTY_MAX_DISTANCE = 0.35;

function dsResult(
  id: string,
  score: number,
  applicable: boolean,
  details?: Record<string, unknown>
): SubCheckResult {
  return { id, category: 'design_system', score, applicable, weight: 1, details };
}


function hasStyleBinding(node: AnyTreeNode): boolean {
  if (isInstanceNode(node)) return true;

  const rec = node as {
    textStyleId?: string;
    fillStyleId?: string;
    strokeStyleId?: string;
    effectStyleId?: string;
    gridStyleId?: string;
    boundVariables?: Record<string, unknown>;
    fills?: Paint[];
    strokes?: Paint[];
  };

  if (
    rec.textStyleId ||
    rec.fillStyleId ||
    rec.strokeStyleId ||
    rec.effectStyleId ||
    rec.gridStyleId
  ) {
    return true;
  }

  if (rec.boundVariables && Object.keys(rec.boundVariables).length > 0) {
    return true;
  }

  for (const paint of [...(rec.fills ?? []), ...(rec.strokes ?? [])]) {
    if (paint.type === 'VARIABLE_COLOR') return true;
  }

  return false;
}

function isStylable(node: AnyTreeNode): boolean {
  if (node.type === 'TEXT') return true;
  if (isInstanceNode(node)) return true;

  const rec = node as {
    fills?: Paint[];
    strokes?: Paint[];
    fillStyleId?: string;
    strokeStyleId?: string;
    effectStyleId?: string;
    textStyleId?: string;
  };
  if (rec.fillStyleId || rec.strokeStyleId || rec.effectStyleId || rec.textStyleId) {
    return true;
  }
  return Boolean((rec.fills?.length ?? 0) > 0 || (rec.strokes?.length ?? 0) > 0);
}

function extractSolidColors(node: AnyTreeNode): RGB[] {
  const colors: RGB[] = [];
  const rec = node as { fills?: Paint[]; strokes?: Paint[] };
  for (const paint of [...(rec.fills ?? []), ...(rec.strokes ?? [])]) {
    if (paint.type === 'SOLID') colors.push(paint.color);
  }
  if (node.type === 'TEXT' && 'styledSegments' in node) {
    const segments = (node as { styledSegments?: { style?: { fills?: Paint[] } }[] }).styledSegments;
    for (const seg of segments ?? []) {
      for (const paint of seg.style?.fills ?? []) {
        if (paint.type === 'SOLID') colors.push(paint.color);
      }
    }
  }
  return colors;
}

function colorDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function nearestCatalogDistance(color: RGB, palette: RGB[]): number {
  if (palette.length === 0) return 1;
  let best = Infinity;
  for (const token of palette) {
    best = Math.min(best, colorDistance(color, token));
  }
  return best;
}

function noveltyScoreForColor(color: RGB, palette: RGB[]): number {
  const dist = nearestCatalogDistance(color, palette);
  return Math.max(0, 1 - dist / NOVELTY_MAX_DISTANCE);
}

/** Node ids in after envelope touched by non-metadata content edits. */
export function collectContentNodeIds(graph: EditGraph, after: FileEnvelope): Set<string> {
  const roots = new Set<string>();

  for (const change of graph.changes) {
    if (change.operation === 'delete') continue;
    if (change.operation === 'add') {
      roots.add(change.nodeId);
      continue;
    }
    if (change.operation === 'modify' && !isMetadataOnlyChange(change.changedProperties)) {
      roots.add(change.nodeId);
    }
  }

  const ids = new Set<string>();
  for (const rootId of roots) {
    for (const id of descendantIds(after, rootId)) ids.add(id);
  }
  return ids;
}

function contentModifiedIds(graph: EditGraph): string[] {
  return graph.changes
    .filter(
      (c) => c.operation === 'modify' && !isMetadataOnlyChange(c.changedProperties)
    )
    .map((c) => c.nodeId);
}

function parentIdOf(envelope: FileEnvelope, nodeId: string): string | null {
  let found: string | null = null;
  const walk = (node: AnyTreeNode, parent: AnyTreeNode | null): void => {
    if (node.type === 'DOCUMENT') {
      for (const ch of node.children) walk(ch, node);
      return;
    }
    if (node.id === nodeId && parent && parent.type !== 'DOCUMENT') {
      found = parent.id;
      return;
    }
    if ('children' in node && Array.isArray((node as { children?: AnyTreeNode[] }).children)) {
      for (const ch of (node as { children: AnyTreeNode[] }).children) walk(ch, node);
    }
  };
  walk(envelope.document, null);
  return found;
}

function geometrySignature(node: AnyTreeNode): string | null {
  if (isInstanceNode(node)) return null;
  if (node.type !== 'FRAME' && node.type !== 'RECTANGLE' && node.type !== 'GROUP') return null;
  const rec = node as { width?: number; height?: number };
  if (typeof rec.width !== 'number' || typeof rec.height !== 'number') return null;
  return `${Math.round(rec.width)}x${Math.round(rec.height)}`;
}

function runStyleReuse(
  contentIds: Set<string>,
  after: FileEnvelope,
  catalog: DesignCatalog
): SubCheckResult {
  const catalogApplicable =
    catalog.hasTextStyles || catalog.paintStyleIds.size > 0 || catalog.hasVariables;

  if (!catalogApplicable) {
    return dsResult('design_system.style_reuse', 1, false, { reason: 'no_design_tokens_in_file' });
  }

  let stylable = 0;
  let bound = 0;
  for (const id of contentIds) {
    const node = findEnvelopeNode(after, id);
    if (!node || !isStylable(node)) continue;
    stylable += 1;
    if (hasStyleBinding(node)) bound += 1;
  }

  if (stylable === 0) {
    return dsResult('design_system.style_reuse', 1, false, { reason: 'no_stylable_content_nodes' });
  }

  const score = bound / stylable;
  return dsResult('design_system.style_reuse', score, true, { bound, stylable });
}

function runNovelty(
  contentIds: Set<string>,
  after: FileEnvelope,
  catalog: DesignCatalog
): SubCheckResult {
  if (catalog.colors.length === 0) {
    return dsResult('design_system.novelty', 1, false, { reason: 'no_catalog_colors' });
  }

  const colors: RGB[] = [];
  for (const id of contentIds) {
    const node = findEnvelopeNode(after, id);
    if (!node) continue;
    colors.push(...extractSolidColors(node));
  }

  if (colors.length === 0) {
    return dsResult('design_system.novelty', 1, false, { reason: 'no_solid_colors_in_content' });
  }

  const perColor = colors.map((c) => noveltyScoreForColor(c, catalog.colors));
  const score = perColor.reduce((a, b) => a + b, 0) / perColor.length;

  return dsResult('design_system.novelty', score, true, {
    colors_checked: colors.length,
    mean_novelty_penalty: 1 - score,
  });
}

function runEditedRegression(
  before: FileEnvelope,
  after: FileEnvelope,
  graph: EditGraph
): SubCheckResult {
  const modified = contentModifiedIds(graph);
  if (modified.length === 0) {
    return dsResult('design_system.edited_regression', 1, false, { reason: 'no_content_modifications' });
  }

  let regressions = 0;
  for (const id of modified) {
    const b = findEnvelopeNode(before, id);
    const a = findEnvelopeNode(after, id);
    if (!b || !a) continue;
    if (hasStyleBinding(b) && !hasStyleBinding(a)) regressions += 1;
  }

  const score = 1 - regressions / modified.length;
  return dsResult('design_system.edited_regression', score, true, {
    regressions,
    modified: modified.length,
  });
}

function runCloneCheat(
  after: FileEnvelope,
  graph: EditGraph,
  catalog: DesignCatalog
): SubCheckResult {
  if (!catalog.hasComponents) {
    return dsResult('design_system.clone_cheat', 1, false, { reason: 'no_components_in_catalog' });
  }

  const added = [...graph.addedIds];
  if (added.length === 0) {
    return dsResult('design_system.clone_cheat', 1, false, { reason: 'no_added_nodes' });
  }

  const byParentSig = new Map<string, number>();
  let cloneCandidates = 0;

  for (const id of added) {
    const node = findEnvelopeNode(after, id);
    if (!node) continue;
    const sig = geometrySignature(node);
    if (!sig) continue;
    cloneCandidates += 1;
    const parentId = parentIdOf(after, id) ?? 'root';
    const key = `${parentId}:${sig}`;
    byParentSig.set(key, (byParentSig.get(key) ?? 0) + 1);
  }

  if (cloneCandidates === 0) {
    return dsResult('design_system.clone_cheat', 1, false, { reason: 'no_geometry_clones' });
  }

  let duplicateGroups = 0;
  for (const count of byParentSig.values()) {
    if (count >= 2) duplicateGroups += 1;
  }

  const violations = [...byParentSig.values()].reduce(
    (sum, count) => sum + (count >= 2 ? count : 0),
    0
  );
  const score = Math.max(0, 1 - violations / Math.max(1, cloneCandidates));

  return dsResult('design_system.clone_cheat', score, true, {
    duplicate_groups: duplicateGroups,
    violations,
    clone_candidates: cloneCandidates,
  });
}

/** Design-system checks on content subtrees from the edit graph. */
export function runDesignSystemChecks(
  before: FileEnvelope,
  after: FileEnvelope,
  graph: EditGraph,
  catalog: DesignCatalog
): SubCheckResult[] {
  const contentIds = collectContentNodeIds(graph, after);

  if (contentIds.size === 0) {
    return [
      dsResult('design_system.style_reuse', 1, false, { reason: 'no_content_changes' }),
      dsResult('design_system.novelty', 1, false, { reason: 'no_content_changes' }),
      dsResult('design_system.edited_regression', 1, false, { reason: 'no_content_changes' }),
      dsResult('design_system.clone_cheat', 1, false, { reason: 'no_content_changes' }),
    ];
  }

  return [
    runStyleReuse(contentIds, after, catalog),
    runNovelty(contentIds, after, catalog),
    runEditedRegression(before, after, graph),
    runCloneCheat(after, graph, catalog),
  ];
}
