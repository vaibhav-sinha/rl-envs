import { findEnvelopeNode } from '../engine/DocumentEngine.js';
import type { AnyTreeNode, FileEnvelope, Paint, RGB, TextNode } from '../model/types.js';
import { collectContentNodeIds } from './designSystem.js';
import type { EditGraph, SubCheckResult } from './types.js';

const WCAG_AA_NORMAL = 4.5;
const MAX_DISTINCT_FONTS = 5;
const MIN_READABLE_FONT_SIZE = 10;

const DEFAULT_FG: RGB = { r: 0, g: 0, b: 0 };
const DEFAULT_BG: RGB = { r: 1, g: 1, b: 1 };

function heurResult(
  id: string,
  score: number,
  applicable: boolean,
  details?: Record<string, unknown>
): SubCheckResult {
  return { id, category: 'heuristics', score, applicable, weight: 1, details };
}

function firstSolidColor(paints: Paint[] | undefined): RGB | null {
  for (const paint of paints ?? []) {
    if (paint.type === 'SOLID') return paint.color;
  }
  return null;
}

function srgbChannel(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: RGB): number {
  const r = srgbChannel(color.r);
  const g = srgbChannel(color.g);
  const b = srgbChannel(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: RGB, background: RGB): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function contrastScore(ratio: number): number {
  return Math.min(1, ratio / WCAG_AA_NORMAL);
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

function resolveBackgroundColor(envelope: FileEnvelope, nodeId: string): RGB {
  let current: string | null = parentIdOf(envelope, nodeId);
  while (current) {
    const node = findEnvelopeNode(envelope, current);
    if (node) {
      const rec = node as { fills?: Paint[]; backgrounds?: Paint[] };
      const fromFill = firstSolidColor(rec.fills) ?? firstSolidColor(rec.backgrounds);
      if (fromFill) return fromFill;
    }
    current = parentIdOf(envelope, current);
  }
  return DEFAULT_BG;
}

function textForegroundColor(node: TextNode): RGB {
  const fromFills = firstSolidColor(node.fills);
  if (fromFills) return fromFills;
  for (const seg of node.styledSegments ?? []) {
    const c = firstSolidColor(seg.style?.fills);
    if (c) return c;
  }
  return DEFAULT_FG;
}

function effectiveFontSize(node: TextNode, envelope: FileEnvelope): number | undefined {
  if (typeof node.fontSize === 'number') return node.fontSize;
  if (node.textStyleId) {
    const style = envelope.textStyles?.find((s) => s.id === node.textStyleId);
    if (typeof style?.fontSize === 'number') return style.fontSize;
  }
  for (const seg of node.styledSegments ?? []) {
    if (typeof seg.style?.fontSize === 'number') return seg.style.fontSize;
  }
  return undefined;
}

function fontSignature(node: TextNode, envelope: FileEnvelope): string {
  const size = effectiveFontSize(node, envelope);
  const styleName = node.textStyleId
    ? envelope.textStyles?.find((s) => s.id === node.textStyleId)?.name
    : undefined;
  const family = node.fontName?.family ?? styleName ?? 'default';
  return `${family}:${size ?? 'inherit'}`;
}

function textNodesInContent(
  after: FileEnvelope,
  contentIds: Set<string>
): TextNode[] {
  const nodes: TextNode[] = [];
  for (const id of contentIds) {
    const node = findEnvelopeNode(after, id);
    if (node?.type === 'TEXT') nodes.push(node);
  }
  return nodes;
}

function runContrast(
  after: FileEnvelope,
  contentIds: Set<string>
): SubCheckResult {
  const texts = textNodesInContent(after, contentIds);
  if (texts.length === 0) {
    return heurResult('heuristics.contrast', 1, false, { reason: 'no_text_in_content' });
  }

  const ratios: number[] = [];
  for (const text of texts) {
    const fg = textForegroundColor(text);
    const bg = resolveBackgroundColor(after, text.id);
    ratios.push(contrastRatio(fg, bg));
  }

  const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const score = contrastScore(meanRatio);

  return heurResult('heuristics.contrast', score, true, {
    texts_checked: texts.length,
    mean_contrast_ratio: meanRatio,
    min_ratio: Math.min(...ratios),
  });
}

function runFontCount(
  after: FileEnvelope,
  contentIds: Set<string>
): SubCheckResult {
  const texts = textNodesInContent(after, contentIds);
  if (texts.length === 0) {
    return heurResult('heuristics.font_count', 1, false, { reason: 'no_text_in_content' });
  }

  const signatures = new Set(texts.map((t) => fontSignature(t, after)));
  const count = signatures.size;
  const score =
    count <= MAX_DISTINCT_FONTS
      ? 1
      : Math.max(0, 1 - (count - MAX_DISTINCT_FONTS) / MAX_DISTINCT_FONTS);

  return heurResult('heuristics.font_count', score, true, {
    distinct_fonts: count,
    max_recommended: MAX_DISTINCT_FONTS,
  });
}

function runReadableFontSize(
  after: FileEnvelope,
  contentIds: Set<string>
): SubCheckResult {
  const texts = textNodesInContent(after, contentIds);
  if (texts.length === 0) {
    return heurResult('heuristics.readable_font_size', 1, false, { reason: 'no_text_in_content' });
  }

  let violations = 0;
  const sizes: number[] = [];
  for (const text of texts) {
    const size = effectiveFontSize(text, after);
    if (size === undefined) continue;
    sizes.push(size);
    if (size < MIN_READABLE_FONT_SIZE) violations += 1;
  }

  if (sizes.length === 0) {
    return heurResult('heuristics.readable_font_size', 1, false, { reason: 'no_resolved_font_sizes' });
  }

  const score = 1 - violations / sizes.length;
  return heurResult('heuristics.readable_font_size', score, true, {
    violations,
    sizes_checked: sizes.length,
    min_size: Math.min(...sizes),
  });
}

/** Low-weight quality heuristics on content-changed subtrees. */
export function runHeuristics(
  _before: FileEnvelope,
  after: FileEnvelope,
  graph: EditGraph
): SubCheckResult[] {
  const contentIds = collectContentNodeIds(graph, after);

  if (contentIds.size === 0) {
    return [
      heurResult('heuristics.contrast', 1, false, { reason: 'no_content_changes' }),
      heurResult('heuristics.font_count', 1, false, { reason: 'no_content_changes' }),
      heurResult('heuristics.readable_font_size', 1, false, { reason: 'no_content_changes' }),
    ];
  }

  return [
    runContrast(after, contentIds),
    runFontCount(after, contentIds),
    runReadableFontSize(after, contentIds),
  ];
}
