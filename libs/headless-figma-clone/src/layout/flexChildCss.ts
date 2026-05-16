import type { FrameNode, LayoutSelfFields, SceneNode } from '../model/types.js';
import { gridChildPlacementCss } from './gridLayout.js';

/** Auto-layout frames use an out-of-flow absolutely positioned flex shell; `width/height:auto` cross-axis would collapse. */
function isAutoLayoutFrameNode(n: SceneNode): n is FrameNode {
  return n.type === 'FRAME' && (n.layoutMode === 'HORIZONTAL' || n.layoutMode === 'VERTICAL');
}

export interface BoxPos {
  absX: number;
  absY: number;
  width: number;
  height: number;
}

function sizingToFlexGrow(sizing: 'FIXED' | 'HUG' | 'FILL' | undefined, layoutGrow: number | undefined): number {
  if (sizing === 'FILL') return layoutGrow && layoutGrow > 0 ? layoutGrow : 1;
  return layoutGrow ?? 0;
}

function sizingToFlexShrink(sizing: 'FIXED' | 'HUG' | 'FILL' | undefined): number {
  /** Undefined = implicit fixed box (Figma default for shapes / unset layout sizing); must not shrink away. */
  if (sizing === 'FIXED' || sizing === 'HUG' || sizing === undefined) return 0;
  return 1;
}

function sizingToFlexBasis(
  sizing: 'FIXED' | 'HUG' | 'FILL' | undefined,
  axisSize: number,
  node: LayoutSelfFields
): string {
  if (sizing === 'HUG') return 'auto';
  if (sizing === 'FILL') return 'auto';
  if (sizing === 'FIXED') return `${String(axisSize)}px`;
  if ((node.layoutGrow ?? 0) > 0) return 'auto';
  return `${String(axisSize)}px`;
}

/** Min/max constraints and flex main-axis shrink default for auto-layout children. */
function flexMinMaxCss(node: LayoutSelfFields, isRow: boolean): string {
  const parts: string[] = [];
  const mainMin = isRow ? node.minWidth : node.minHeight;
  const mainMax = isRow ? node.maxWidth : node.maxHeight;
  const crossMin = isRow ? node.minHeight : node.minWidth;
  const crossMax = isRow ? node.maxHeight : node.maxWidth;

  if (mainMin !== undefined) {
    parts.push(isRow ? `min-width:${String(mainMin)}px` : `min-height:${String(mainMin)}px`);
  } else {
    parts.push(isRow ? 'min-width:0' : 'min-height:0');
  }
  if (mainMax !== undefined) {
    parts.push(isRow ? `max-width:${String(mainMax)}px` : `max-height:${String(mainMax)}px`);
  }
  if (crossMin !== undefined) {
    parts.push(isRow ? `min-height:${String(crossMin)}px` : `min-width:${String(crossMin)}px`);
  }
  if (crossMax !== undefined) {
    parts.push(isRow ? `max-height:${String(crossMax)}px` : `max-width:${String(crossMax)}px`);
  }
  return parts.length > 0 ? `${parts.join(';')};` : '';
}

/** Constraint CSS for non-flex (absolute) children relative to parent box. */
export function constraintPositionCss(
  node: LayoutSelfFields & { x: number; y: number; width: number; height: number },
  parentW: number,
  parentH: number
): string {
  const c = node.constraints;
  if (!c) {
    return `left:${String(node.x)}px;top:${String(node.y)}px;width:${String(node.width)}px;height:${String(node.height)}px;`;
  }
  const parts: string[] = ['position:absolute', 'box-sizing:border-box'];
  const h = c.horizontal;
  const v = c.vertical;
  if (h === 'STRETCH' || h === 'SCALE') {
    parts.push(`left:${String(node.x)}px`, `right:${String(Math.max(0, parentW - node.x - node.width))}px`);
    if (h !== 'STRETCH') parts.push(`width:${String(node.width)}px`);
  } else if (h === 'CENTER') {
    // `left:50%` places the child's left edge at the parent's horizontal midpoint; offset by Figma x from that point.
    parts.push(`left:50%`, `margin-left:${String(node.x - parentW / 2)}px`, `width:${String(node.width)}px`);
  } else if (h === 'MAX') {
    parts.push(`right:${String(Math.max(0, parentW - node.x - node.width))}px`, `width:${String(node.width)}px`);
  } else {
    parts.push(`left:${String(node.x)}px`, `width:${String(node.width)}px`);
  }
  if (v === 'STRETCH' || v === 'SCALE') {
    parts.push(`top:${String(node.y)}px`, `bottom:${String(Math.max(0, parentH - node.y - node.height))}px`);
    if (v !== 'STRETCH') parts.push(`height:${String(node.height)}px`);
  } else if (v === 'CENTER') {
    // `top:50%` places the child's top edge at the parent's vertical midpoint; offset by Figma y from that point.
    parts.push(`top:50%`, `margin-top:${String(node.y - parentH / 2)}px`, `height:${String(node.height)}px`);
  } else if (v === 'MAX') {
    parts.push(`bottom:${String(Math.max(0, parentH - node.y - node.height))}px`, `height:${String(node.height)}px`);
  } else {
    parts.push(`top:${String(node.y)}px`, `height:${String(node.height)}px`);
  }
  return `${parts.join(';')};`;
}

/** Position + flex child sizing for auto-layout children (Phase 7). */
export function flexChildLayoutCss(
  node: SceneNode,
  insideFlex: boolean,
  box: BoxPos,
  parentFrame?: FrameNode
): string {
  const n = node as LayoutSelfFields & { x: number; y: number; width: number; height: number };
  if (!insideFlex) {
    return `position:absolute;left:${String(box.absX)}px;top:${String(box.absY)}px;width:${String(box.width)}px;height:${String(box.height)}px;`;
  }
  if (n.layoutPositioning === 'ABSOLUTE') {
    return `position:absolute;left:${String(n.x)}px;top:${String(n.y)}px;width:${String(box.width)}px;height:${String(box.height)}px;`;
  }
  if (parentFrame?.layoutMode === 'GRID') {
    return `position:relative;left:0;top:0;width:${String(box.width)}px;height:${String(box.height)}px;${gridChildPlacementCss(node)}`;
  }
  const isRow = parentFrame?.layoutMode !== 'VERTICAL';
  const mainSizing = isRow ? n.layoutSizingHorizontal : n.layoutSizingVertical;
  const crossSizing = isRow ? n.layoutSizingVertical : n.layoutSizingHorizontal;
  const mainSize = isRow ? box.width : box.height;
  const crossSize = isRow ? box.height : box.width;
  const grow = sizingToFlexGrow(mainSizing, n.layoutGrow);
  const shrink = sizingToFlexShrink(mainSizing);
  /** Model `width`/`height` already include intrinsic hug; flex-basis:auto would collapse AL frames whose only children are AP flex shells. */
  let basisMain = sizingToFlexBasis(mainSizing, mainSize, n);
  if (basisMain.endsWith('px') && !basisMain.includes('auto')) {
    const px = Math.round(mainSize);
    basisMain = `${String(px)}px`;
  }
  if (isAutoLayoutFrameNode(node) && mainSizing === 'HUG') {
    basisMain = `${String(Math.round(mainSize))}px`;
  }
  const alignSelf =
    crossSizing === 'FILL' || n.layoutAlign === 'STRETCH'
      ? 'align-self:stretch;'
      : n.layoutAlign === 'CENTER'
        ? 'align-self:center;'
        : n.layoutAlign === 'MAX'
          ? 'align-self:flex-end;'
          : '';
  const crossDim =
    crossSizing === 'HUG' && !isAutoLayoutFrameNode(node)
      ? isRow
        ? 'height:auto;'
        : 'width:auto;'
      : crossSizing === 'FILL'
        ? ''
        : isRow
          ? `height:${String(crossSize)}px;`
          : `width:${String(crossSize)}px;`;
  return `position:relative;left:0;top:0;flex:${String(grow)} ${String(shrink)} ${basisMain};${flexMinMaxCss(n, !!isRow)}${alignSelf}${crossDim}`;
}
