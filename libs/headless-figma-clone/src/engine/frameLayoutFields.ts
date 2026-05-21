import type { FrameNode, FrameVariableBindings, LayoutMode, TextNode } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

export const GRID_LAYOUT_FIELD_KEYS = [
  'gridRowCount',
  'gridColumnCount',
  'gridRowGap',
  'gridColumnGap',
  'gridRowSizes',
  'gridColumnSizes',
] as const;

/** Auto-layout axis fields (Figma: applicable when layoutMode is HORIZONTAL or VERTICAL). */
export const AUTO_LAYOUT_AXIS_FIELD_KEYS = [
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'itemSpacing',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
] as const;

const WRAP_DEPENDENT_FIELD_KEYS = ['counterAxisSpacing', 'counterAxisAlignContent'] as const;

const GRID_BOUND_VARIABLE_KEYS = ['gridRowGap', 'gridColumnGap'] as const;

export function isHorizontalVerticalAutoLayout(mode: LayoutMode | undefined): boolean {
  return mode === 'HORIZONTAL' || mode === 'VERTICAL';
}

export function effectiveLayoutMode(
  frame: Pick<FrameNode, 'layoutMode'>,
  patch?: Record<string, unknown>
): LayoutMode | undefined {
  if (patch && 'layoutMode' in patch) {
    return patch.layoutMode as LayoutMode | undefined;
  }
  return frame.layoutMode;
}

export function effectiveLayoutWrap(
  frame: Pick<FrameNode, 'layoutWrap'>,
  patch?: Record<string, unknown>
): FrameNode['layoutWrap'] | undefined {
  if (patch && 'layoutWrap' in patch) {
    return patch.layoutWrap as FrameNode['layoutWrap'];
  }
  return frame.layoutWrap;
}

/** Drop layout fields that are inactive for the frame's current layoutMode (import sentinels). */
export function sanitizeGridLayoutFields(f: FrameNode): void {
  if (f.layoutMode === 'GRID') return;
  for (const key of GRID_LAYOUT_FIELD_KEYS) {
    delete f[key];
  }
  if (f.boundVariables) {
    for (const key of GRID_BOUND_VARIABLE_KEYS) {
      delete (f.boundVariables as Record<string, unknown>)[key];
    }
  }
}

export function sanitizeFrameAutoLayoutFields(f: FrameNode): void {
  const mode = f.layoutMode ?? 'NONE';
  if (!isHorizontalVerticalAutoLayout(mode)) {
    for (const key of AUTO_LAYOUT_AXIS_FIELD_KEYS) {
      delete f[key];
    }
    delete f.layoutWrap;
    for (const key of WRAP_DEPENDENT_FIELD_KEYS) {
      delete f[key];
    }
    if (f.boundVariables) {
      for (const key of ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'counterAxisSpacing'] as const) {
        delete (f.boundVariables as Record<string, unknown>)[key];
      }
    }
    return;
  }
  if (mode !== 'HORIZONTAL') {
    delete f.layoutWrap;
    for (const key of WRAP_DEPENDENT_FIELD_KEYS) {
      delete f[key];
    }
    if (f.boundVariables) {
      delete f.boundVariables.counterAxisSpacing;
    }
  } else if (f.layoutWrap !== 'WRAP') {
    for (const key of WRAP_DEPENDENT_FIELD_KEYS) {
      delete f[key];
    }
    if (f.boundVariables) {
      delete f.boundVariables.counterAxisSpacing;
    }
  }
}

export function sanitizeFrameLayoutFields(f: FrameNode): void {
  sanitizeGridLayoutFields(f);
  sanitizeFrameAutoLayoutFields(f);
}

/** Reject explicit patches that set layout fields outside their applicable mode (Figma plugin parity). */
export function assertFrameLayoutPatchAllowed(frame: FrameNode, patch: Record<string, unknown>): void {
  const mode = effectiveLayoutMode(frame, patch);
  const wrap = effectiveLayoutWrap(frame, patch);

  for (const key of AUTO_LAYOUT_AXIS_FIELD_KEYS) {
    if (key in patch && !isHorizontalVerticalAutoLayout(mode)) {
      throw new ValidationErr(
        'VALIDATION_ERROR',
        `${key} requires layoutMode HORIZONTAL or VERTICAL`
      );
    }
  }
  for (const key of WRAP_DEPENDENT_FIELD_KEYS) {
    if (!(key in patch)) continue;
    if (!isHorizontalVerticalAutoLayout(mode)) {
      throw new ValidationErr(
        'VALIDATION_ERROR',
        `${key} requires layoutMode HORIZONTAL or VERTICAL`
      );
    }
    if (mode !== 'HORIZONTAL') {
      throw new ValidationErr('VALIDATION_ERROR', `${key} requires layoutMode HORIZONTAL`);
    }
    if (wrap !== 'WRAP') {
      throw new ValidationErr('VALIDATION_ERROR', `${key} requires layoutWrap WRAP`);
    }
  }
  if ('layoutWrap' in patch && mode !== 'HORIZONTAL') {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutWrap requires layoutMode HORIZONTAL');
  }
  for (const key of GRID_LAYOUT_FIELD_KEYS) {
    if (key in patch && mode !== 'GRID') {
      throw new ValidationErr('VALIDATION_ERROR', `${key} requires layoutMode GRID`);
    }
  }
}

export function frameBoundVariableFieldsForMode(mode: LayoutMode | undefined): Set<string> {
  const base = new Set([
    'width',
    'height',
    'characters',
    'visible',
    'topLeftRadius',
    'topRightRadius',
    'bottomLeftRadius',
    'bottomRightRadius',
    'minWidth',
    'maxWidth',
    'minHeight',
    'maxHeight',
    'strokeWeight',
    'strokeTopWeight',
    'strokeRightWeight',
    'strokeBottomWeight',
    'strokeLeftWeight',
    'opacity',
  ]);
  if (isHorizontalVerticalAutoLayout(mode)) {
    base.add('itemSpacing');
    base.add('paddingLeft');
    base.add('paddingRight');
    base.add('paddingTop');
    base.add('paddingBottom');
  }
  if (mode === 'HORIZONTAL') {
    base.add('counterAxisSpacing');
  }
  if (mode === 'GRID') {
    base.add('gridRowGap');
    base.add('gridColumnGap');
  }
  return base;
}

export function filterFrameBoundVariablesForMode(
  bv: FrameVariableBindings | undefined,
  mode: LayoutMode | undefined
): FrameVariableBindings | undefined {
  if (!bv) return undefined;
  const allowed = frameBoundVariableFieldsForMode(mode);
  const out: FrameVariableBindings = {};
  for (const [k, v] of Object.entries(bv)) {
    if (allowed.has(k)) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeTextTruncationFields(t: TextNode): void {
  if (t.textTruncation !== 'ENDING') {
    delete t.maxLines;
  }
}

export function assertTextTruncationPatchAllowed(text: TextNode, patch: Record<string, unknown>): void {
  if (!('maxLines' in patch)) return;
  const truncation =
    'textTruncation' in patch
      ? patch.textTruncation === null
        ? undefined
        : (patch.textTruncation as TextNode['textTruncation'])
      : text.textTruncation;
  if (truncation !== 'ENDING') {
    throw new ValidationErr('VALIDATION_ERROR', 'maxLines requires textTruncation ENDING');
  }
}

/** Import-time frame layout props (shared by mapFrameLayout and snapshot import). */
export function mapImportedFrameLayoutProps(
  props: Record<string, unknown>,
  frameWidth: number,
  opts: {
    optStr: (v: unknown) => string | undefined;
    optNum: (v: unknown) => number | undefined;
    prop: (obj: Record<string, unknown>, key: string) => unknown;
    normalizeLayoutGrids: (
      grids: unknown,
      width: number,
      label: string
    ) => FrameNode['layoutGrids'] | undefined;
  }
): Partial<FrameNode> {
  const { optStr, optNum, prop, normalizeLayoutGrids } = opts;
  const out: Partial<FrameNode> = {};
  const layoutMode = optStr(prop(props, 'layoutMode'));

  if (layoutMode === 'HORIZONTAL') {
    const wrap = optStr(prop(props, 'layoutWrap'));
    if (wrap === 'NO_WRAP' || wrap === 'WRAP') out.layoutWrap = wrap;
    if (wrap === 'WRAP') {
      const cas = optNum(prop(props, 'counterAxisSpacing'));
      if (cas !== undefined) out.counterAxisSpacing = cas;
      const cac = optStr(prop(props, 'counterAxisAlignContent'));
      if (cac === 'AUTO' || cac === 'SPACE_BETWEEN') out.counterAxisAlignContent = cac;
    }
    const pasm = optStr(prop(props, 'primaryAxisSizingMode'));
    if (pasm === 'FIXED' || pasm === 'HUG' || pasm === 'FILL') out.primaryAxisSizingMode = pasm;
    const casm = optStr(prop(props, 'counterAxisSizingMode'));
    if (casm === 'FIXED' || casm === 'HUG' || casm === 'FILL') out.counterAxisSizingMode = casm;
    if (prop(props, 'itemReverseZIndex') === true) out.itemReverseZIndex = true;
    if (prop(props, 'strokesIncludedInLayout') === true) out.strokesIncludedInLayout = true;
  } else if (layoutMode === 'VERTICAL') {
    const pasm = optStr(prop(props, 'primaryAxisSizingMode'));
    if (pasm === 'FIXED' || pasm === 'HUG' || pasm === 'FILL') out.primaryAxisSizingMode = pasm;
    const casm = optStr(prop(props, 'counterAxisSizingMode'));
    if (casm === 'FIXED' || casm === 'HUG' || casm === 'FILL') out.counterAxisSizingMode = casm;
    if (prop(props, 'itemReverseZIndex') === true) out.itemReverseZIndex = true;
    if (prop(props, 'strokesIncludedInLayout') === true) out.strokesIncludedInLayout = true;
  }

  if (layoutMode === 'GRID') {
    const rc = optNum(prop(props, 'gridRowCount'));
    const cc = optNum(prop(props, 'gridColumnCount'));
    const rg = optNum(prop(props, 'gridRowGap'));
    const cg = optNum(prop(props, 'gridColumnGap'));
    if (rc !== undefined && rc >= 1) out.gridRowCount = rc;
    if (cc !== undefined && cc >= 1) out.gridColumnCount = cc;
    if (rg !== undefined) out.gridRowGap = rg;
    if (cg !== undefined) out.gridColumnGap = cg;
    if (Array.isArray(prop(props, 'gridRowSizes'))) {
      out.gridRowSizes = prop(props, 'gridRowSizes') as FrameNode['gridRowSizes'];
    }
    if (Array.isArray(prop(props, 'gridColumnSizes'))) {
      out.gridColumnSizes = prop(props, 'gridColumnSizes') as FrameNode['gridColumnSizes'];
    }
  }

  try {
    const grids = normalizeLayoutGrids(prop(props, 'layoutGrids'), frameWidth, 'layoutGrids');
    if (grids?.length) out.layoutGrids = grids;
  } catch {
    /* skip invalid grid */
  }
  return out;
}

export function mapImportedFrameAutoLayoutScalars(
  props: Record<string, unknown>,
  opts: {
    optStr: (v: unknown) => string | undefined;
    optNum: (v: unknown) => number | undefined;
    prop: (obj: Record<string, unknown>, key: string) => unknown;
  }
): Partial<FrameNode> {
  const { optStr, optNum, prop } = opts;
  const layoutMode = optStr(prop(props, 'layoutMode'));
  if (!isHorizontalVerticalAutoLayout(layoutMode as LayoutMode)) {
    return {};
  }
  const out: Partial<FrameNode> = {};
  const pl = optNum(prop(props, 'paddingLeft'));
  const pr = optNum(prop(props, 'paddingRight'));
  const pt = optNum(prop(props, 'paddingTop'));
  const pb = optNum(prop(props, 'paddingBottom'));
  const is_ = optNum(prop(props, 'itemSpacing'));
  if (pl !== undefined) out.paddingLeft = pl;
  if (pr !== undefined) out.paddingRight = pr;
  if (pt !== undefined) out.paddingTop = pt;
  if (pb !== undefined) out.paddingBottom = pb;
  if (is_ !== undefined) out.itemSpacing = is_;
  const pai = optStr(prop(props, 'primaryAxisAlignItems'));
  if (pai === 'MIN' || pai === 'CENTER' || pai === 'MAX' || pai === 'SPACE_BETWEEN') {
    out.primaryAxisAlignItems = pai;
  }
  const cai = optStr(prop(props, 'counterAxisAlignItems'));
  if (cai === 'MIN' || cai === 'CENTER' || cai === 'MAX' || cai === 'BASELINE') {
    out.counterAxisAlignItems = cai;
  }
  return out;
}
