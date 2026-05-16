import type {
  FileEnvelope,
  FrameNode,
  LayoutSizing,
  SceneNode,
  TableNode,
  TextNode,
  TransformGroupNode,
} from '../model/types.js';
import {
  effectiveTextMaxFontSizePx,
  hugTextLineHeightPxFromTypography,
} from './typographyCss.js';
import { resolveVariableToStringValue } from '../variables/resolution.js';

/** Matches Figma default dimensions for `createFrame` / `createAutoLayout` before explicit resize. */
const FIGMA_DEFAULT_FRAME_MIN_SIDE = 100;

/** Loose Inter-like advance estimate for Latin UI text (0.52 was too tight vs browser line metrics → false wraps). */
const TEXT_WIDTH_CHAR_FACTOR = 0.62;

/** Small horizontal slack so hugging TEXT boxes stay ≥ typical browser line width (avoids pre-wrap false wraps). */
function approximateTextWidthPx(chars: string, fontSize: number): number {
  const raw = chars.length * fontSize * TEXT_WIDTH_CHAR_FACTOR;
  return Math.max(0, Math.ceil(raw) + Math.ceil(fontSize * 0.35));
}

/**
 * Prefer Figma-exported line width when it is present and not far below the heuristic
 * (very small exports still use the heuristic to avoid false wraps in the browser).
 */
function reasonableExportedTextWidth(exported: number, approx: number): number {
  if (exported <= 0) return approx;
  if (approx <= 0) return exported;
  return exported >= approx * 1 ? exported : approx;
}

/** Hug/FILL text width for layout sums and compile-time `width` materialization. */
function hugTextIntrinsicWidthPx(t: TextNode, env: FileEnvelope | undefined): number {
  const fs = effectiveTextMaxFontSizePx(t, env);
  const approx = approximateTextWidthPx(textCharactersForIntrinsicSizing(t, env), fs);
  const exported = t.width ?? 0;
  if (exported > 0) {
    if (t.layoutSizingHorizontal === 'HUG' || t.layoutSizingHorizontal === 'FILL') {
      return reasonableExportedTextWidth(exported, approx);
    }
    if (t.layoutSizingHorizontal !== 'FIXED') {
      return exported;
    }
  }
  return approx;
}

export function textCharactersForIntrinsicSizing(t: TextNode, env: FileEnvelope | undefined): string {
  const vid = t.boundVariables?.characters;
  if (env && vid) {
    const s = resolveVariableToStringValue(env, vid);
    if (s !== null) return s;
  }
  return t.characters ?? '';
}

function textIntrinsicWidthForAutoLayout(t: TextNode, env: FileEnvelope | undefined): number {
  const fs = effectiveTextMaxFontSizePx(t, env);
  if (t.layoutSizingHorizontal === 'FIXED') {
    return Math.max(0, t.width);
  }
  if (t.layoutSizingHorizontal === 'HUG' || t.layoutSizingHorizontal === 'FILL') {
    return hugTextIntrinsicWidthPx(t, env);
  }
  if (typeof t.width === 'number' && t.width > 0) {
    return Math.max(0, t.width);
  }
  return approximateTextWidthPx(textCharactersForIntrinsicSizing(t, env), fs);
}

/** One-line text box height for layout + CSS (extra px for descenders vs browser metrics). */
export function hugTextLineHeightPx(fontSize: number, lineHeight?: TextNode['lineHeight']): number {
  return hugTextLineHeightPxFromTypography(fontSize, lineHeight);
}

/** Figma `textAutoResize: HEIGHT` wraps at fixed width; hugging AL must reserve multiple lines. */
function textNeedsWrappedIntrinsicHeight(t: TextNode): boolean {
  if (t.textAutoResize === 'HEIGHT') return true;
  if (t.textAutoResize === 'NONE' && t.layoutSizingHorizontal === 'FIXED' && (t.width ?? 0) > 0) {
    return true;
  }
  if (t.textTruncation === 'ENDING' && t.maxLines != null && t.maxLines > 1) return true;
  return false;
}

function boxWidthForWrappedIntrinsicHeight(t: TextNode, env: FileEnvelope | undefined): number {
  const fs = effectiveTextMaxFontSizePx(t, env);
  if (t.layoutSizingHorizontal === 'FIXED' || (t.width ?? 0) > 0) {
    return Math.max(0, t.width ?? 0);
  }
  return approximateTextWidthPx(textCharactersForIntrinsicSizing(t, env), fs);
}

function approximateWrappedLineCount(chars: string, boxWidthPx: number, fontSize: number): number {
  if (!chars.length) return 1;
  if (boxWidthPx <= 0) return Math.max(1, chars.split('\n').length);

  const charW = fontSize * TEXT_WIDTH_CHAR_FACTOR;
  const charsPerLine = Math.max(1, Math.floor(boxWidthPx / charW));
  let total = 0;
  for (const para of chars.split('\n')) {
    total += Math.max(1, Math.ceil(para.length / charsPerLine));
  }
  return Math.max(1, total);
}

function approximateWrappedTextHeightPx(t: TextNode, env: FileEnvelope | undefined): number {
  const fs = effectiveTextMaxFontSizePx(t, env);
  const lineH = hugTextLineHeightPx(fs, t.lineHeight);
  const chars = textCharactersForIntrinsicSizing(t, env);
  const boxW = boxWidthForWrappedIntrinsicHeight(t, env);
  const lineCount = approximateWrappedLineCount(chars, boxW, fs);
  const paraCount = Math.max(1, chars.split('\n').length);
  const paraGap = (t.paragraphSpacing ?? 0) * Math.max(0, paraCount - 1);
  return Math.ceil(lineCount * lineH + paraGap);
}

function hugTextIntrinsicHeightPx(t: TextNode, env: FileEnvelope | undefined): number {
  if (textNeedsWrappedIntrinsicHeight(t)) {
    return approximateWrappedTextHeightPx(t, env);
  }
  const fs = effectiveTextMaxFontSizePx(t, env);
  return hugTextLineHeightPx(fs, t.lineHeight);
}

function textIntrinsicHeightForAutoLayout(t: TextNode, env: FileEnvelope | undefined): number {
  if (t.layoutSizingVertical === 'FIXED') {
    return Math.max(0, t.height);
  }
  if (t.layoutSizingVertical === 'HUG' || t.layoutSizingVertical === 'FILL') {
    return hugTextIntrinsicHeightPx(t, env);
  }
  if (typeof t.height === 'number' && t.height > 0) {
    return Math.max(0, t.height);
  }
  return hugTextIntrinsicHeightPx(t, env);
}

function padX(f: FrameNode): number {
  return (f.paddingLeft ?? 0) + (f.paddingRight ?? 0);
}

function padY(f: FrameNode): number {
  return (f.paddingTop ?? 0) + (f.paddingBottom ?? 0);
}

/** Inner width available to children of a vertical auto-layout frame. */
function parentInnerCrossWidthPx(parent: FrameNode): number {
  if (parent.layoutMode !== 'VERTICAL') return 0;
  return Math.max(0, parent.width - padX(parent));
}

/** Inner height available to children of a horizontal auto-layout frame. */
function parentInnerCrossHeightPx(parent: FrameNode): number {
  if (parent.layoutMode !== 'HORIZONTAL') return 0;
  return Math.max(0, parent.height - padY(parent));
}

/** Whether this frame behaves as auto-layout container in our renderer. */
function isFlexFrame(f: FrameNode): boolean {
  return f.layoutMode === 'HORIZONTAL' || f.layoutMode === 'VERTICAL' || f.layoutMode === 'GRID';
}

/** Primary axis unspecified or not FIXED → Figma derives size from laid-out contents. */
function primaryAxisNeedsIntrinsic(mode: LayoutSizing | undefined): boolean {
  return mode !== 'FIXED';
}

/**
 * Counter-axis unspecified behaves like initial fixed numeric size from `createFrame` (do not widen from children).
 * HUG explicitly recomputes from children; FIXED keeps width/height.
 */
function counterAxisNeedsIntrinsic(mode: LayoutSizing | undefined): boolean {
  return mode === 'HUG' || mode === 'FILL';
}

/**
 * Largest horizontal span under a VERTICAL stacking parent — max child widths.
 * For RECTANGLE/etc: width. For FLEX frame: recurse only if subtree already resolved width.
 */
function maxCrossWidthVertStack(n: SceneNode, env: FileEnvelope | undefined): number {
  switch (n.type) {
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'LINE':
    case 'POLYGON':
    case 'STAR':
    case 'SLICE':
    case 'SECTION':
      return Math.max(0, n.width);
    case 'TEXT': {
      const t = n as TextNode;
      return textIntrinsicWidthForAutoLayout(t, env);
    }
    case 'VECTOR': {
      return Math.max(0, n.width);
    }
    case 'BOOLEAN_OPERATION':
      return Math.max(0, n.width);
    case 'TABLE': {
      const t = n as TableNode;
      const sum = t.columnWidths.reduce((a, b) => a + b, 0);
      return Math.max(0, sum);
    }
    case 'TRANSFORM_GROUP': {
      const tg = n as TransformGroupNode;
      if (!tg.children?.length) return Math.max(0, tg.width);
      let mx = 0;
      for (const c of tg.children) {
        mx = Math.max(mx, Math.max(0, c.x) + maxCrossWidthVertStack(c as SceneNode, env));
      }
      return mx;
    }
    case 'GROUP': {
      if (!n.children?.length) return Math.max(0, n.width);
      let mx = 0;
      for (const c of n.children) mx = Math.max(mx, Math.max(0, c.x) + maxCrossWidthVertStack(c, env));
      return mx;
    }
    case 'FRAME': {
      const f = n as FrameNode;
      if (isFlexFrame(f)) return Math.max(0, f.width);
      if (!f.children?.length) return Math.max(0, f.width);
      let mx = 0;
      for (const c of f.children) mx = Math.max(mx, Math.max(0, c.x) + maxCrossWidthVertStack(c, env));
      return mx;
    }
    default:
      return Math.max(0, (n as { width?: number }).width ?? 0);
  }
}

/** Tallest vertical span under a HORIZONTAL row — max child heights. */
function maxCrossHeightHorizRow(n: SceneNode, env: FileEnvelope | undefined): number {
  switch (n.type) {
    case 'RECTANGLE':
    case 'ELLIPSE':
    case 'LINE':
    case 'POLYGON':
    case 'STAR':
    case 'SLICE':
    case 'SECTION':
      return Math.max(0, n.height);
    case 'TEXT': {
      const t = n as TextNode;
      return textIntrinsicHeightForAutoLayout(t, env);
    }
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
      return Math.max(0, n.height);
    case 'TABLE': {
      const t = n as TableNode;
      const sum = t.rowHeights.reduce((a, b) => a + b, 0);
      return Math.max(0, sum);
    }
    case 'TRANSFORM_GROUP': {
      const tg = n as TransformGroupNode;
      if (!tg.children?.length) return Math.max(0, tg.height);
      let mx = 0;
      for (const c of tg.children) mx = Math.max(mx, Math.max(0, c.y) + maxCrossHeightHorizRow(c as SceneNode, env));
      return mx;
    }
    case 'GROUP': {
      if (!n.children?.length) return Math.max(0, n.height);
      let mx = 0;
      for (const c of n.children) mx = Math.max(mx, Math.max(0, c.y) + maxCrossHeightHorizRow(c, env));
      return mx;
    }
    case 'FRAME': {
      const f = n as FrameNode;
      if (isFlexFrame(f)) return Math.max(0, f.height);
      if (!f.children?.length) return Math.max(0, f.height);
      let mx = 0;
      for (const c of f.children) mx = Math.max(mx, Math.max(0, c.y) + maxCrossHeightHorizRow(c, env));
      return mx;
    }
    default:
      return Math.max(0, (n as { height?: number }).height ?? 0);
  }
}

/**
 * Vertical stack intrinsic height along primary axis non-wrap.
 */
/**
 * When a vertical auto-layout frame has a fixed height but hugging children need taller
 * line boxes than Figma's nominal font sizes, shrink row gap so the stack still fits (Figma
 * visually compresses inter-line rhythm before clipping descenders).
 */
export function effectiveVerticalItemSpacingPx(f: FrameNode): number {
  const gap = f.itemSpacing ?? 0;
  return gap;
}

function sumPrimaryHeightsVert(f: FrameNode, env: FileEnvelope | undefined): number {
  const kids = f.children;
  if (kids.length === 0) return 0;
  const gap = f.itemSpacing ?? 0;
  let s = 0;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]!;
    s += intrinsicMainSizeAsFlexChildVert(c, env);
    if (i < kids.length - 1) s += gap;
  }
  return s;
}

/** Main-axis size contributed by child when parent is VERTICAL AL. */
function intrinsicMainSizeAsFlexChildVert(n: SceneNode, env: FileEnvelope | undefined): number {
  return isFlexFrame(n as FrameNode) ? (n as FrameNode).height : maxCrossHeightHorizRow(n, env);
}

function sumPrimaryWidthsHoriz(f: FrameNode, env: FileEnvelope | undefined): number {
  const kids = f.children;
  if (kids.length === 0) return 0;
  const gap = f.itemSpacing ?? 0;
  let s = 0;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]!;
    s += intrinsicMainSizeAsFlexChildHoriz(c, env);
    if (i < kids.length - 1) s += gap;
  }
  return s;
}

function intrinsicMainSizeAsFlexChildHoriz(n: SceneNode, env: FileEnvelope | undefined): number {
  return isFlexFrame(n as FrameNode) ? (n as FrameNode).width : maxCrossWidthVertStack(n, env);
}

/**
 * Map child's `primaryAxisSizingMode` / `counterAxisSizingMode` into `layoutSizingHorizontal` /
 * `layoutSizingVertical`. Those axes are defined on the **child** frame's own auto-layout (horizontal
 * row → primary is width; vertical stack → primary is height), regardless of parent's layout direction —
 * orthogonal nesting would otherwise flip width/height semantics and corrupt flex CSS.
 */
export function syncFrameLayoutSizingForAutoLayoutParents(f: FrameNode): void {
  if (!isFlexFrame(f) || !f.children?.length) return;
  for (const ch of f.children) {
    if (ch.type !== 'FRAME') continue;
    const c = ch as FrameNode;
    if (!isFlexFrame(c)) continue;
    const mainSizing = c.primaryAxisSizingMode;
    const crossSizing = c.counterAxisSizingMode;
    if (mainSizing === undefined && crossSizing === undefined) continue;

    if (c.layoutMode === 'HORIZONTAL') {
      if (mainSizing !== undefined) c.layoutSizingHorizontal = mainSizing;
      if (crossSizing !== undefined) c.layoutSizingVertical = crossSizing;
    } else {
      if (mainSizing !== undefined) c.layoutSizingVertical = mainSizing;
      if (crossSizing !== undefined) c.layoutSizingHorizontal = crossSizing;
    }
  }
}

/**
 * After intrinsic frame sizing, materialize hugging TEXT width/height for bounds measurement and CSS.
 */
export function syncHugTextLayoutMetricsDeep(n: SceneNode, env?: FileEnvelope): void {
  if (n.type === 'BOOLEAN_OPERATION' && 'children' in n && Array.isArray(n.children)) {
    for (const c of n.children as unknown as SceneNode[]) syncHugTextLayoutMetricsDeep(c, env);
  } else if (
    (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP') &&
    'children' in n &&
    Array.isArray(n.children)
  ) {
    const list = (n as { children: SceneNode[] }).children;
    for (const c of list) syncHugTextLayoutMetricsDeep(c, env);
  }

  if (n.type !== 'TEXT') return;
  const t = n as TextNode;
  if (t.textOnPath) return;
  /** HUG/FILL, or legacy absolute text (no layout sizing + 0×0 defaults) — HTML needs a non-zero box. */
  const needsIntrinsicW =
    t.layoutSizingHorizontal === 'HUG' ||
    t.layoutSizingHorizontal === 'FILL' ||
    (t.layoutSizingHorizontal !== 'FIXED' && (t.width ?? 0) <= 0);
  const needsIntrinsicH =
    t.layoutSizingVertical === 'HUG' ||
    t.layoutSizingVertical === 'FILL' ||
    (t.layoutSizingVertical !== 'FIXED' && (t.height ?? 0) <= 0);
  if (needsIntrinsicW) {
    t.width = hugTextIntrinsicWidthPx(t, env);
  }
  if (needsIntrinsicH) {
    t.height = hugTextIntrinsicHeightPx(t, env);
  }
}

/**
 * Recursively resolve intrinsic width/height for auto-layout frames that are not FIXED on both axes,
 * approximate Figma "hug contents" sizing before CSS compile.
 *
 * Mutates the tree (expected to run on structuredClone subtree).
 */
export function applyAutoLayoutIntrinsicSizingDeep(
  n: SceneNode,
  env?: FileEnvelope,
  parent?: FrameNode
): void {
  if (n.type === 'BOOLEAN_OPERATION' && 'children' in n && Array.isArray(n.children)) {
    for (const c of n.children as unknown as SceneNode[]) applyAutoLayoutIntrinsicSizingDeep(c, env, parent);
  } else if (
    (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP') &&
    'children' in n &&
    Array.isArray(n.children)
  ) {
    const list = (n as { children: SceneNode[] }).children;
    const frameParent = n.type === 'FRAME' ? (n as FrameNode) : parent;
    for (const c of list) applyAutoLayoutIntrinsicSizingDeep(c, env, frameParent);
  }

  if (n.type !== 'FRAME') return;
  const f = n as FrameNode;
  if (!isFlexFrame(f)) return;

  const primaryIntrinsic = primaryAxisNeedsIntrinsic(f.primaryAxisSizingMode);
  const counterIntrinsic = counterAxisNeedsIntrinsic(f.counterAxisSizingMode);

  let newW = f.width;
  let newH = f.height;

  if (f.layoutMode === 'VERTICAL') {
    if (counterIntrinsic) {
      let cross = 0;
      for (const c of f.children) cross = Math.max(cross, maxCrossWidthVertStack(c, env));
      const target = cross + padX(f);
      newW = f.counterAxisSizingMode === 'HUG' || f.counterAxisSizingMode === 'FILL' ? target : Math.max(f.width, target);
    }
    if (primaryIntrinsic) {
      const target = sumPrimaryHeightsVert(f, env) + padY(f);
      newH = f.primaryAxisSizingMode === 'HUG' || f.primaryAxisSizingMode === 'FILL' ? target : Math.max(f.height, target);
    }
  } else {
    if (primaryIntrinsic) {
      const target = sumPrimaryWidthsHoriz(f, env) + padX(f);
      newW = f.primaryAxisSizingMode === 'HUG' || f.primaryAxisSizingMode === 'FILL' ? target : Math.max(f.width, target);
    }
    if (counterIntrinsic) {
      let cross = 0;
      for (const c of f.children) cross = Math.max(cross, maxCrossHeightHorizRow(c, env));
      const target = cross + padY(f);
      newH = f.counterAxisSizingMode === 'HUG' || f.counterAxisSizingMode === 'FILL' ? target : Math.max(f.height, target);
    }
  }

  /** Row in a vertical stack must not outgrow the parent's inner width (exported fill/hug rows). */
  if (f.layoutMode === 'HORIZONTAL' && parent?.layoutMode === 'VERTICAL' && primaryIntrinsic) {
    const cap = parentInnerCrossWidthPx(parent);
    if (cap > 0 && newW > cap) {
      const cross = f.layoutSizingHorizontal;
      if (cross === 'HUG' || cross === 'FILL' || f.width <= cap) {
        newW = cap;
      }
    }
  }
  /** Column in a horizontal stack must not outgrow the parent's inner height. */
  if (f.layoutMode === 'VERTICAL' && parent?.layoutMode === 'HORIZONTAL' && primaryIntrinsic) {
    const cap = parentInnerCrossHeightPx(parent);
    if (cap > 0 && newH > cap) {
      const cross = f.layoutSizingVertical;
      if (cross === 'HUG' || cross === 'FILL' || f.height <= cap) {
        newH = cap;
      }
    }
  }

  /** Do not shrink below declared fixed axis sizes. */
  if (!primaryIntrinsic) {
    if (f.layoutMode === 'VERTICAL') newH = f.height;
    else newW = f.width;
  }
  if (!counterIntrinsic) {
    if (f.layoutMode === 'VERTICAL') newW = f.width;
    else newH = f.height;
  }

  /**
   * Empty auto-layout: Figma keeps at least ~100 on any intrinsic axis so padding-only
   * does not define the whole box; when both axes hug, use a square like createFrame defaults.
   */
  if (f.children.length === 0) {
    if (primaryIntrinsic && counterIntrinsic) {
      const s = Math.max(newW, newH, FIGMA_DEFAULT_FRAME_MIN_SIDE);
      newW = s;
      newH = s;
    } else if (primaryIntrinsic) {
      if (f.layoutMode === 'VERTICAL') {
        newH = Math.max(newH, FIGMA_DEFAULT_FRAME_MIN_SIDE);
      } else {
        newW = Math.max(newW, FIGMA_DEFAULT_FRAME_MIN_SIDE);
      }
    } else if (counterIntrinsic) {
      if (f.layoutMode === 'VERTICAL') {
        newW = Math.max(newW, FIGMA_DEFAULT_FRAME_MIN_SIDE);
      } else {
        newH = Math.max(newH, FIGMA_DEFAULT_FRAME_MIN_SIDE);
      }
    }
  }

  f.width = newW;
  f.height = newH;

  syncFrameLayoutSizingForAutoLayoutParents(f);
}
