import type { FileEnvelope, FrameNode, GridTrackSize, SceneNode } from '../model/types.js';
import { hugTextLineHeightPxFromTypography } from '../render/typographyCss.js';
import type { TextNode } from '../model/types.js';

export function isGridFrame(f: FrameNode): boolean {
  return f.layoutMode === 'GRID';
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

  for (const ch of children) {
    if (ch.layoutPositioning === 'ABSOLUTE') continue;
    const r0 = ch.gridRowAnchorIndex ?? 0;
    const c0 = ch.gridColumnAnchorIndex ?? 0;
    const rs = ch.gridRowSpan ?? 1;
    const cs = ch.gridColumnSpan ?? 1;
    rowHugs[r0] = Math.max(rowHugs[r0] ?? 0, measureChildMinCross(ch, env) * rs);
    colHugs[c0] = Math.max(colHugs[c0] ?? 0, measureChildMinMain(ch) * cs);
  }

  const rows = rowSizes.map((t, i) => trackToCss(t, rowHugs[i])).join(' ');
  const cols = colSizes.map((t, i) => trackToCss(t, colHugs[i])).join(' ');
  return {
    rows,
    cols,
    rowGap: `${String(f.gridRowGap ?? 0)}px`,
    colGap: `${String(f.gridColumnGap ?? 0)}px`,
  };
}

export function gridChildPlacementCss(ch: SceneNode): string {
  if (ch.layoutPositioning === 'ABSOLUTE') return '';
  const r0 = (ch.gridRowAnchorIndex ?? 0) + 1;
  const c0 = (ch.gridColumnAnchorIndex ?? 0) + 1;
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
  return `display:grid;grid-template-rows:${t.rows};grid-template-columns:${t.cols};row-gap:${t.rowGap};column-gap:${t.colGap};box-sizing:border-box;width:100%;height:100%;padding:${String(f.paddingTop ?? 0)}px ${String(f.paddingRight ?? 0)}px ${String(f.paddingBottom ?? 0)}px ${String(f.paddingLeft ?? 0)}px;`;
}
