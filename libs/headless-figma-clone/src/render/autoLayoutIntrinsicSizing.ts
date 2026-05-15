import type {
  FrameNode,
  LayoutSizing,
  SceneNode,
  TableNode,
  TextNode,
  TransformGroupNode,
} from '../model/types.js';

/** Matches Figma default dimensions for `createFrame` / `createAutoLayout` before explicit resize. */
const FIGMA_DEFAULT_FRAME_MIN_SIDE = 100;

function padX(f: FrameNode): number {
  return (f.paddingLeft ?? 0) + (f.paddingRight ?? 0);
}

function padY(f: FrameNode): number {
  return (f.paddingTop ?? 0) + (f.paddingBottom ?? 0);
}

/** Whether this frame behaves as auto-layout container in our renderer. */
function isFlexFrame(f: FrameNode): boolean {
  return f.layoutMode === 'HORIZONTAL' || f.layoutMode === 'VERTICAL';
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
function maxCrossWidthVertStack(n: SceneNode): number {
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
      const w =
        typeof t.width === 'number' ? t.width : Math.max(0, (t.characters?.length ?? 0) * (t.fontSize ?? 13) * 0.52);
      return Math.max(0, w);
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
      for (const c of tg.children) mx = Math.max(mx, Math.max(0, c.x) + maxCrossWidthVertStack(c as SceneNode));
      return mx;
    }
    case 'GROUP': {
      if (!n.children?.length) return Math.max(0, n.width);
      let mx = 0;
      for (const c of n.children) mx = Math.max(mx, Math.max(0, c.x) + maxCrossWidthVertStack(c));
      return mx;
    }
    case 'FRAME': {
      const f = n as FrameNode;
      if (isFlexFrame(f)) return Math.max(0, f.width);
      if (!f.children?.length) return Math.max(0, f.width);
      let mx = 0;
      for (const c of f.children) mx = Math.max(mx, Math.max(0, c.x) + maxCrossWidthVertStack(c));
      return mx;
    }
    default:
      return Math.max(0, (n as { width?: number }).width ?? 0);
  }
}

/** Tallest vertical span under a HORIZONTAL row — max child heights. */
function maxCrossHeightHorizRow(n: SceneNode): number {
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
      return Math.max(0, typeof t.height === 'number' ? t.height : t.fontSize ?? 13);
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
      for (const c of tg.children) mx = Math.max(mx, Math.max(0, c.y) + maxCrossHeightHorizRow(c as SceneNode));
      return mx;
    }
    case 'GROUP': {
      if (!n.children?.length) return Math.max(0, n.height);
      let mx = 0;
      for (const c of n.children) mx = Math.max(mx, Math.max(0, c.y) + maxCrossHeightHorizRow(c));
      return mx;
    }
    case 'FRAME': {
      const f = n as FrameNode;
      if (isFlexFrame(f)) return Math.max(0, f.height);
      if (!f.children?.length) return Math.max(0, f.height);
      let mx = 0;
      for (const c of f.children) mx = Math.max(mx, Math.max(0, c.y) + maxCrossHeightHorizRow(c));
      return mx;
    }
    default:
      return Math.max(0, (n as { height?: number }).height ?? 0);
  }
}

/**
 * Vertical stack intrinsic height along primary axis non-wrap.
 */
function sumPrimaryHeightsVert(f: FrameNode): number {
  const kids = f.children;
  if (kids.length === 0) return 0;
  const gap = f.itemSpacing ?? 0;
  let s = 0;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]!;
    s += intrinsicMainSizeAsFlexChildVert(c);
    if (i < kids.length - 1) s += gap;
  }
  return s;
}

/** Main-axis size contributed by child when parent is VERTICAL AL. */
function intrinsicMainSizeAsFlexChildVert(n: SceneNode): number {
  return isFlexFrame(n as FrameNode) ? (n as FrameNode).height : maxCrossHeightHorizRow(n);
}

function sumPrimaryWidthsHoriz(f: FrameNode): number {
  const kids = f.children;
  if (kids.length === 0) return 0;
  const gap = f.itemSpacing ?? 0;
  let s = 0;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i]!;
    s += intrinsicMainSizeAsFlexChildHoriz(f, c);
    if (i < kids.length - 1) s += gap;
  }
  return s;
}

function intrinsicMainSizeAsFlexChildHoriz(_parent: FrameNode, n: SceneNode): number {
  return isFlexFrame(n as FrameNode) ? (n as FrameNode).width : maxCrossWidthVertStack(n);
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
 * Recursively resolve intrinsic width/height for auto-layout frames that are not FIXED on both axes,
 * approximate Figma "hug contents" sizing before CSS compile.
 *
 * Mutates the tree (expected to run on structuredClone subtree).
 */
export function applyAutoLayoutIntrinsicSizingDeep(n: SceneNode): void {
  if (n.type === 'BOOLEAN_OPERATION' && 'children' in n && Array.isArray(n.children)) {
    for (const c of n.children as unknown as SceneNode[]) applyAutoLayoutIntrinsicSizingDeep(c);
  } else if (
    (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP') &&
    'children' in n &&
    Array.isArray(n.children)
  ) {
    const list = (n as { children: SceneNode[] }).children;
    for (const c of list) applyAutoLayoutIntrinsicSizingDeep(c);
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
      for (const c of f.children) cross = Math.max(cross, maxCrossWidthVertStack(c));
      const target = cross + padX(f);
      newW = f.counterAxisSizingMode === 'HUG' || f.counterAxisSizingMode === 'FILL' ? target : Math.max(f.width, target);
    }
    if (primaryIntrinsic) {
      const target = sumPrimaryHeightsVert(f) + padY(f);
      newH = f.primaryAxisSizingMode === 'HUG' || f.primaryAxisSizingMode === 'FILL' ? target : Math.max(f.height, target);
    }
  } else {
    if (primaryIntrinsic) {
      const target = sumPrimaryWidthsHoriz(f) + padX(f);
      newW = f.primaryAxisSizingMode === 'HUG' || f.primaryAxisSizingMode === 'FILL' ? target : Math.max(f.width, target);
    }
    if (counterIntrinsic) {
      let cross = 0;
      for (const c of f.children) cross = Math.max(cross, maxCrossHeightHorizRow(c));
      const target = cross + padY(f);
      newH = f.counterAxisSizingMode === 'HUG' || f.counterAxisSizingMode === 'FILL' ? target : Math.max(f.height, target);
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
   * Empty auto-layout frames with both axes hugging content:
   * - Use a square so asymmetric padding does not squash one axis.
   * - Figma keeps at least the standard new-frame minimum (~100×100), not padding-only size.
   */
  if (f.children.length === 0 && primaryIntrinsic && counterIntrinsic) {
    const s = Math.max(newW, newH, FIGMA_DEFAULT_FRAME_MIN_SIDE);
    newW = s;
    newH = s;
  }

  f.width = newW;
  f.height = newH;

  syncFrameLayoutSizingForAutoLayoutParents(f);
}
