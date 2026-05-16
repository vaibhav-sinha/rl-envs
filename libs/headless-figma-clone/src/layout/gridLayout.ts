import type { FileEnvelope, FrameNode, GridTrackSize, SceneNode } from '../model/types.js';
import { hugTextLineHeightPxFromTypography } from '../render/typographyCss.js';
import type { TextNode } from '../model/types.js';
import { cssVarNameForVariable, resolveVariableToFloat } from '../variables/resolution.js';

function boundGridGapCss(
  env: FileEnvelope | undefined,
  variableId: string | undefined,
  fallbackPx: number,
  nodeModeOverrides?: Record<string, string>
): string {
  if (!variableId || !env) return `${String(fallbackPx)}px`;
  const v = resolveVariableToFloat(env, variableId, nodeModeOverrides);
  const fb = v !== null ? v : fallbackPx;
  return `var(${cssVarNameForVariable(variableId)},${String(fb)}px)`;
}

export function isGridFrame(f: FrameNode): boolean {
  return f.layoutMode === 'GRID';
}

export interface GridCellAnchor {
  row: number;
  col: number;
}

function cellKey(row: number, col: number): string {
  return `${String(row)},${String(col)}`;
}

function occupies(
  occupied: Set<string>,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number
): boolean {
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      if (occupied.has(cellKey(r, c))) return true;
    }
  }
  return false;
}

function markOccupied(
  occupied: Set<string>,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number
): void {
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      occupied.add(cellKey(r, c));
    }
  }
}

function nextFreeCell(
  occupied: Set<string>,
  rowCount: number,
  colCount: number,
  rowSpan: number,
  colSpan: number
): GridCellAnchor | null {
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (!occupies(occupied, r, c, rowSpan, colSpan)) return { row: r, col: c };
    }
  }
  return null;
}

/** Figma row-major auto-placement for grid children without explicit anchors. */
export function buildGridPlacementIndex(parent: FrameNode, children: SceneNode[]): Map<string, GridCellAnchor> {
  const rowCount = Math.max(1, parent.gridRowCount ?? 1);
  const colCount = Math.max(1, parent.gridColumnCount ?? 1);
  const occupied = new Set<string>();
  const placements = new Map<string, GridCellAnchor>();
  const layoutChildren = children.filter((ch) => ch.layoutPositioning !== 'ABSOLUTE');

  for (const ch of layoutChildren) {
    if (ch.gridRowAnchorIndex === undefined || ch.gridColumnAnchorIndex === undefined) continue;
    const rs = ch.gridRowSpan ?? 1;
    const cs = ch.gridColumnSpan ?? 1;
    const row = ch.gridRowAnchorIndex;
    const col = ch.gridColumnAnchorIndex;
    placements.set(ch.id, { row, col });
    markOccupied(occupied, row, col, rs, cs);
  }

  for (const ch of layoutChildren) {
    if (placements.has(ch.id)) continue;
    const rs = ch.gridRowSpan ?? 1;
    const cs = ch.gridColumnSpan ?? 1;
    const pos = nextFreeCell(occupied, rowCount, colCount, rs, cs) ?? { row: 0, col: 0 };
    placements.set(ch.id, pos);
    markOccupied(occupied, pos.row, pos.col, rs, cs);
  }

  return placements;
}

/** Persist Figma-style grid cell anchors when a child is appended to a grid frame. */
export function assignGridChildAutoPlacement(parent: FrameNode, child: SceneNode): void {
  if (parent.layoutMode !== 'GRID' || child.layoutPositioning === 'ABSOLUTE') return;
  if (child.gridRowAnchorIndex !== undefined && child.gridColumnAnchorIndex !== undefined) return;
  const placements = buildGridPlacementIndex(parent, parent.children);
  const pos = placements.get(child.id);
  if (!pos) return;
  child.gridRowAnchorIndex = pos.row;
  child.gridColumnAnchorIndex = pos.col;
}

function trackToCss(track: GridTrackSize, hugPx?: number): string {
  if (track.type === 'FIXED') return `${String(track.value)}px`;
  if (track.type === 'HUG') return hugPx !== undefined ? `${String(hugPx)}px` : 'max-content';
  const fr = track.value ?? 1;
  return `minmax(0,${String(fr)}fr)`;
}

function measureChildMinCross(n: SceneNode, _env?: FileEnvelope): number {
  if (n.type === 'TEXT') {
    const t = n as TextNode;
    const fs = t.fontSize ?? 12;
    return hugTextLineHeightPxFromTypography(fs, t.lineHeight);
  }
  return n.height;
}

function measureChildMinMain(n: SceneNode): number {
  return n.width;
}

export function computeGridTemplate(
  f: FrameNode,
  children: SceneNode[],
  env?: FileEnvelope
): { rows: string; cols: string; rowGap: string; colGap: string } {
  const rc = Math.max(1, f.gridRowCount ?? 1);
  const cc = Math.max(1, f.gridColumnCount ?? 1);
  const rowSizes = f.gridRowSizes ?? Array.from({ length: rc }, () => ({ type: 'FLEX' as const }));
  const colSizes = f.gridColumnSizes ?? Array.from({ length: cc }, () => ({ type: 'FLEX' as const }));

  const rowHugs: number[] = Array(rc).fill(0);
  const colHugs: number[] = Array(cc).fill(0);

  const placements = buildGridPlacementIndex(f, children);
  for (const ch of children) {
    if (ch.layoutPositioning === 'ABSOLUTE') continue;
    const anchor = placements.get(ch.id) ?? { row: 0, col: 0 };
    const rs = ch.gridRowSpan ?? 1;
    const cs = ch.gridColumnSpan ?? 1;
    rowHugs[anchor.row] = Math.max(rowHugs[anchor.row] ?? 0, measureChildMinCross(ch, env) * rs);
    colHugs[anchor.col] = Math.max(colHugs[anchor.col] ?? 0, measureChildMinMain(ch) * cs);
  }

  const rows = rowSizes.map((t, i) => trackToCss(t, rowHugs[i])).join(' ');
  const cols = colSizes.map((t, i) => trackToCss(t, colHugs[i])).join(' ');
  const modes = f.explicitVariableModes;
  const rowGapPx = f.gridRowGap ?? 0;
  const colGapPx = f.gridColumnGap ?? 0;
  return {
    rows,
    cols,
    rowGap: boundGridGapCss(env, f.boundVariables?.gridRowGap, rowGapPx, modes),
    colGap: boundGridGapCss(env, f.boundVariables?.gridColumnGap, colGapPx, modes),
  };
}

export function gridChildPlacementCss(ch: SceneNode, parent?: FrameNode): string {
  if (ch.layoutPositioning === 'ABSOLUTE') return '';
  const anchor =
    parent && isGridFrame(parent)
      ? (buildGridPlacementIndex(parent, parent.children).get(ch.id) ?? { row: 0, col: 0 })
      : { row: ch.gridRowAnchorIndex ?? 0, col: ch.gridColumnAnchorIndex ?? 0 };
  const r0 = anchor.row + 1;
  const c0 = anchor.col + 1;
  const rs = ch.gridRowSpan ?? 1;
  const cs = ch.gridColumnSpan ?? 1;
  let s = `grid-row:${String(r0)} / span ${String(rs)};grid-column:${String(c0)} / span ${String(cs)};`;
  const ha = ch.gridChildHorizontalAlign;
  const va = ch.gridChildVerticalAlign;
  if (ha === 'CENTER') s += 'justify-self:center;';
  else if (ha === 'MAX') s += 'justify-self:end;';
  else if (ha === 'MIN') s += 'justify-self:start;';
  if (va === 'CENTER') s += 'align-self:center;';
  else if (va === 'MAX') s += 'align-self:end;';
  else if (va === 'MIN') s += 'align-self:start;';
  return s;
}

export function frameGridInnerStyle(f: FrameNode, children: SceneNode[], env?: FileEnvelope): string {
  const t = computeGridTemplate(f, children, env);
  const modes = f.explicitVariableModes;
  const pt = boundGridGapCss(env, f.boundVariables?.paddingTop, f.paddingTop ?? 0, modes);
  const pr = boundGridGapCss(env, f.boundVariables?.paddingRight, f.paddingRight ?? 0, modes);
  const pb = boundGridGapCss(env, f.boundVariables?.paddingBottom, f.paddingBottom ?? 0, modes);
  const pl = boundGridGapCss(env, f.boundVariables?.paddingLeft, f.paddingLeft ?? 0, modes);
  return `display:grid;grid-template-rows:${t.rows};grid-template-columns:${t.cols};row-gap:${t.rowGap};column-gap:${t.colGap};box-sizing:border-box;width:100%;height:100%;padding:${pt} ${pr} ${pb} ${pl};`;
}
