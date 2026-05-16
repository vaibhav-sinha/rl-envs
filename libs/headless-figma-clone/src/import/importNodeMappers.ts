import type {
  BlendMode,
  ComponentOverrideFields,
  ComponentPropertyValue,
  FrameNode,
  LayoutConstraints,
  LayoutSelfFields,
  Paint,
  TextNode,
} from '../model/types.js';
import type { FigmaIdMap } from './idMap.js';
import { normalizeLayoutConstraints, normalizeLayoutGrids } from '../engine/figmaInterop.js';
import { parseStyledSegmentsInput } from '../engine/styledSegmentsNormalize.js';
import {
  parseLetterSpacing,
  parseLineHeight,
  parseTextCase,
  parseTextDecoration,
  parseTextListOptions,
} from '../engine/typographyParse.js';
import type { ImportReport } from './importReport.js';
import {
  bool,
  mapPaints,
  optNum,
  optStr,
  prop,
  skipUnknownProperty,
} from './propertyMappers.js';

/** Snapshot property keys consumed by the importer (for unmapped-key reporting). */
export const HANDLED_SNAPSHOT_KEYS = new Set([
  'x',
  'y',
  'width',
  'height',
  'absoluteBoundingBox',
  'absoluteRenderBounds',
  'visible',
  'locked',
  'opacity',
  'blendMode',
  'rotation',
  'effects',
  'effectStyleId',
  'fills',
  'fillStyleId',
  'strokes',
  'strokeStyleId',
  'strokeWeight',
  'strokeAlign',
  'strokeCap',
  'strokeJoin',
  'miterLimit',
  'dashPattern',
  'individualStrokeWeights',
  'cornerRadius',
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
  'cornerSmoothing',
  'constraints',
  'layoutPositioning',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'layoutAlign',
  'layoutGrow',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'gridRowSpan',
  'gridColumnSpan',
  'gridRowAnchorIndex',
  'gridColumnAnchorIndex',
  'gridChildHorizontalAlign',
  'gridChildVerticalAlign',
  'boundVariables',
  'explicitVariableModes',
  'isMask',
  'hfcIconSvgAsset',
  'hfcIconPngAsset',
  'clipsContent',
  'backgrounds',
  'layoutMode',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'itemSpacing',
  'counterAxisSpacing',
  'layoutWrap',
  'counterAxisAlignContent',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
  'overflowDirection',
  'layoutGrids',
  'gridStyleId',
  'gridRowCount',
  'gridColumnCount',
  'gridRowGap',
  'gridColumnGap',
  'gridRowSizes',
  'gridColumnSizes',
  'characters',
  'fontSize',
  'fontWeight',
  'fontName',
  'textAlignHorizontal',
  'textAlignVertical',
  'textAutoResize',
  'textTruncation',
  'maxLines',
  'lineHeight',
  'letterSpacing',
  'styledSegments',
  'textDecoration',
  'textCase',
  'leadingTrim',
  'paragraphIndent',
  'paragraphSpacing',
  'listSpacing',
  'hangingPunctuation',
  'hangingList',
  'listOptions',
  'openTypeFeatures',
  'hyperlink',
  'textStyleId',
  'textOnPath',
  'vectorPaths',
  'booleanOperation',
  'pointCount',
  'innerRadius',
  'arcData',
  'mainComponent',
  'componentProperties',
  'overrides',
  'exportSettings',
  'reactions',
  'relativeTransform',
  'absoluteTransform',
]);

export function reportUnmappedProperties(
  figmaId: string,
  props: Record<string, unknown>,
  report: ImportReport
): void {
  for (const key of Object.keys(props)) {
    if (!HANDLED_SNAPSHOT_KEYS.has(key)) {
      skipUnknownProperty(report, figmaId, key, 'not mapped');
    }
  }
}

export function mapConstraints(props: Record<string, unknown>): LayoutConstraints | undefined {
  try {
    return normalizeLayoutConstraints(prop(props, 'constraints'), 'constraints');
  } catch {
    return undefined;
  }
}

export function mapMinMax(props: Record<string, unknown>): Partial<LayoutSelfFields> {
  const out: Partial<LayoutSelfFields> = {};
  const minW = optNum(prop(props, 'minWidth'));
  const maxW = optNum(prop(props, 'maxWidth'));
  const minH = optNum(prop(props, 'minHeight'));
  const maxH = optNum(prop(props, 'maxHeight'));
  if (minW !== undefined) out.minWidth = minW;
  if (maxW !== undefined) out.maxWidth = maxW;
  if (minH !== undefined) out.minHeight = minH;
  if (maxH !== undefined) out.maxHeight = maxH;
  return out;
}

export function mapGridChild(props: Record<string, unknown>): Partial<LayoutSelfFields> {
  const out: Partial<LayoutSelfFields> = {};
  const rs = optNum(prop(props, 'gridRowSpan'));
  const cs = optNum(prop(props, 'gridColumnSpan'));
  const ra = optNum(prop(props, 'gridRowAnchorIndex'));
  const ca = optNum(prop(props, 'gridColumnAnchorIndex'));
  if (rs !== undefined) out.gridRowSpan = rs;
  if (cs !== undefined) out.gridColumnSpan = cs;
  if (ra !== undefined) out.gridRowAnchorIndex = ra;
  if (ca !== undefined) out.gridColumnAnchorIndex = ca;
  const ha = optStr(prop(props, 'gridChildHorizontalAlign'));
  if (ha === 'MIN' || ha === 'CENTER' || ha === 'MAX' || ha === 'AUTO') {
    out.gridChildHorizontalAlign = ha;
  }
  const va = optStr(prop(props, 'gridChildVerticalAlign'));
  if (va === 'MIN' || va === 'CENTER' || va === 'MAX' || va === 'AUTO') {
    out.gridChildVerticalAlign = va;
  }
  return out;
}

function remapVariableAlias(
  raw: unknown,
  idMap: FigmaIdMap
): { type: 'VARIABLE_ALIAS'; id: string } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const figmaId = typeof o.id === 'string' ? o.id : undefined;
  if (!figmaId) return undefined;
  const hfc = idMap.get(figmaId) ?? idMap.allocate(figmaId);
  return { type: 'VARIABLE_ALIAS', id: hfc };
}

function remapBoundVariableRecord(
  raw: unknown,
  idMap: FigmaIdMap
): Record<string, { type: 'VARIABLE_ALIAS'; id: string }> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, { type: 'VARIABLE_ALIAS'; id: string }> = {};
  for (const [field, val] of Object.entries(raw as Record<string, unknown>)) {
    const alias = remapVariableAlias(val, idMap);
    if (alias) out[field] = alias;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapExplicitVariableModes(
  props: Record<string, unknown>,
  idMap: FigmaIdMap
): Record<string, string> | undefined {
  const raw = prop(props, 'explicitVariableModes');
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [colId, modeId] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof modeId !== 'string') continue;
    out[idMap.allocate(colId)] = idMap.allocate(modeId);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapBoundVariables(
  props: Record<string, unknown>,
  idMap: FigmaIdMap
): Record<string, unknown> | undefined {
  const raw = prop(props, 'boundVariables');
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [field, val] of Object.entries(o)) {
    if (field === 'fills' || field === 'strokes' || field === 'effects') {
      if (Array.isArray(val)) {
        out[field] = val.map((item) => remapBoundVariableRecord(item, idMap) ?? item);
      }
      continue;
    }
    const alias = remapVariableAlias(val, idMap);
    if (alias) out[field] = alias.id;
    else {
      const rec = remapBoundVariableRecord(val, idMap);
      if (rec) out[field] = rec;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapFrameLayout(
  props: Record<string, unknown>,
  frameWidth: number
): Partial<FrameNode> {
  const out: Partial<FrameNode> = {};
  const wrap = optStr(prop(props, 'layoutWrap'));
  if (wrap === 'NO_WRAP' || wrap === 'WRAP') out.layoutWrap = wrap;
  const cas = optNum(prop(props, 'counterAxisSpacing'));
  if (cas !== undefined) out.counterAxisSpacing = cas;
  const cac = optStr(prop(props, 'counterAxisAlignContent'));
  if (cac === 'AUTO' || cac === 'SPACE_BETWEEN') out.counterAxisAlignContent = cac;
  const pasm = optStr(prop(props, 'primaryAxisSizingMode'));
  if (pasm === 'FIXED' || pasm === 'HUG' || pasm === 'FILL') out.primaryAxisSizingMode = pasm;
  const casm = optStr(prop(props, 'counterAxisSizingMode'));
  if (casm === 'FIXED' || casm === 'HUG' || casm === 'FILL') out.counterAxisSizingMode = casm;
  if (prop(props, 'itemReverseZIndex') === true) out.itemReverseZIndex = true;
  if (prop(props, 'strokesIncludedInLayout') === true) out.strokesIncludedInLayout = true;
  const rc = optNum(prop(props, 'gridRowCount'));
  const cc = optNum(prop(props, 'gridColumnCount'));
  const rg = optNum(prop(props, 'gridRowGap'));
  const cg = optNum(prop(props, 'gridColumnGap'));
  if (rc !== undefined) out.gridRowCount = rc;
  if (cc !== undefined) out.gridColumnCount = cc;
  if (rg !== undefined) out.gridRowGap = rg;
  if (cg !== undefined) out.gridColumnGap = cg;
  if (Array.isArray(prop(props, 'gridRowSizes'))) {
    out.gridRowSizes = prop(props, 'gridRowSizes') as FrameNode['gridRowSizes'];
  }
  if (Array.isArray(prop(props, 'gridColumnSizes'))) {
    out.gridColumnSizes = prop(props, 'gridColumnSizes') as FrameNode['gridColumnSizes'];
  }
  try {
    const grids = normalizeLayoutGrids(prop(props, 'layoutGrids'), frameWidth, 'layoutGrids');
    if (grids?.length) out.layoutGrids = grids;
  } catch {
    /* skip invalid grid */
  }
  return out;
}

export function mapIndividualStrokes(props: Record<string, unknown>): Record<string, unknown> {
  const raw = prop(props, 'individualStrokeWeights') as Record<string, unknown> | undefined;
  if (!raw) return {};
  const out: Record<string, unknown> = {};
  const top = optNum(raw.top);
  const right = optNum(raw.right);
  const bottom = optNum(raw.bottom);
  const left = optNum(raw.left);
  if (top !== undefined) out.strokeTopWeight = top;
  if (right !== undefined) out.strokeRightWeight = right;
  if (bottom !== undefined) out.strokeBottomWeight = bottom;
  if (left !== undefined) out.strokeLeftWeight = left;
  return out;
}

export function mapArcData(props: Record<string, unknown>): Record<string, unknown> {
  const raw = prop(props, 'arcData') as Record<string, unknown> | undefined;
  if (!raw) return {};
  const sa = optNum(raw.startingAngle);
  const ea = optNum(raw.endingAngle);
  const ir = optNum(raw.innerRadius);
  if (sa === undefined || ea === undefined || ir === undefined) return {};
  return { arcData: { startingAngle: sa, endingAngle: ea, innerRadius: ir } };
}

function lenientParse<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function mapTypography(props: Record<string, unknown>): Partial<TextNode> {
  const out: Partial<TextNode> = {};
  const lh = lenientParse(() => parseLineHeight(prop(props, 'lineHeight'), 'lineHeight'));
  if (lh) out.lineHeight = lh;
  const ls = lenientParse(() => parseLetterSpacing(prop(props, 'letterSpacing'), 'letterSpacing'));
  if (ls) out.letterSpacing = ls;
  lenientParse(() => parseTextCase(prop(props, 'textCase'), 'textCase'));
  lenientParse(() => parseTextDecoration(prop(props, 'textDecoration'), 'textDecoration'));
  const lt = optStr(prop(props, 'leadingTrim'));
  if (lt === 'CAP_HEIGHT' || lt === 'NONE') out.leadingTrim = lt;
  const pi = optNum(prop(props, 'paragraphIndent'));
  if (pi !== undefined) out.paragraphIndent = pi;
  const ps = optNum(prop(props, 'paragraphSpacing'));
  if (ps !== undefined) out.paragraphSpacing = ps;
  const lsp = optNum(prop(props, 'listSpacing'));
  if (lsp !== undefined) out.listSpacing = lsp;
  if (prop(props, 'hangingPunctuation') === true) out.hangingPunctuation = true;
  if (prop(props, 'hangingList') === true) out.hangingList = true;
  const lo = lenientParse(() => parseTextListOptions(prop(props, 'listOptions'), 'listOptions'));
  if (lo) out.listOptions = lo;
  const tt = optStr(prop(props, 'textTruncation'));
  if (tt === 'DISABLED' || tt === 'ENDING') out.textTruncation = tt;
  const ml = prop(props, 'maxLines');
  if (ml === null) out.maxLines = null;
  else {
    const n = optNum(ml);
    if (n !== undefined) out.maxLines = n;
  }
  const segs = lenientParse(() => parseStyledSegmentsInput(prop(props, 'styledSegments')));
  if (segs?.length) out.styledSegments = segs;
  return out;
}

export function mapPatternPaint(
  p: Record<string, unknown>,
  idMap: FigmaIdMap
): Paint | null {
  if (p.type !== 'PATTERN') return null;
  const sourceRef = p.sourceNodeId;
  let figmaSourceId: string | undefined;
  if (typeof sourceRef === 'string') figmaSourceId = sourceRef;
  else if (sourceRef && typeof sourceRef === 'object' && typeof (sourceRef as { id?: string }).id === 'string') {
    figmaSourceId = (sourceRef as { id: string }).id;
  }
  if (!figmaSourceId) return null;
  const sourceNodeId = idMap.get(figmaSourceId) ?? idMap.allocate(figmaSourceId);
  const sf = optNum(p.scalingFactor);
  if (sf === undefined || sf <= 0) return null;
  const spacingRaw = p.spacing as { x?: number; y?: number } | undefined;
  const spacing =
    spacingRaw && typeof spacingRaw.x === 'number' && typeof spacingRaw.y === 'number'
      ? { x: spacingRaw.x, y: spacingRaw.y }
      : undefined;
  const hAlign = p.horizontalAlignment;
  const vAlign = p.verticalAlignment;
  return {
    type: 'PATTERN',
    sourceNodeId,
    tileType: 'RECTANGULAR',
    scalingFactor: sf,
    spacing,
    horizontalAlignment:
      hAlign === 'START' || hAlign === 'CENTER' || hAlign === 'END' ? hAlign : undefined,
    verticalAlignment: vAlign === 'START' || vAlign === 'CENTER' || vAlign === 'END' ? vAlign : undefined,
    visible: bool(p.visible),
    opacity: optNum(p.opacity),
    blendMode: p.blendMode as BlendMode | undefined,
  };
}

export function mapPaintsExtended(
  raw: unknown,
  imageHashRemap: (figmaHash: string) => string | undefined,
  idMap: FigmaIdMap
): Paint[] | undefined {
  if (!Array.isArray(raw)) return mapPaints(raw, imageHashRemap);
  const out: Paint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;
    if (p.type === 'PATTERN') {
      const pat = mapPatternPaint(p, idMap);
      if (pat) out.push(pat);
      continue;
    }
    const single = mapPaints([item], imageHashRemap);
    if (single?.[0]) out.push(single[0]);
  }
  return out.length > 0 ? out : undefined;
}

export function mapInstanceOverrides(
  raw: unknown,
  idMap: FigmaIdMap,
  imageHashRemap: (figmaHash: string) => string | undefined
): Record<string, ComponentOverrideFields> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, ComponentOverrideFields> = {};
  for (const [figmaNodeId, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const o = val as Record<string, unknown>;
    const hfcId = idMap.get(figmaNodeId) ?? idMap.allocate(figmaNodeId);
    const entry: ComponentOverrideFields = {};
    if (typeof o.characters === 'string') entry.characters = o.characters;
    const fs = optNum(o.fontSize);
    if (fs !== undefined) entry.fontSize = fs;
    const fw = optNum(o.fontWeight);
    if (fw !== undefined) entry.fontWeight = fw;
    const fills = mapPaintsExtended(o.fills, imageHashRemap, idMap);
    if (fills) entry.fills = fills;
    if (Object.keys(entry).length > 0) out[hfcId] = entry;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapComponentProperties(raw: unknown): Record<string, ComponentPropertyValue> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, ComponentPropertyValue> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const v = val as Record<string, unknown>;
    const t = v.type;
    if (t === 'BOOLEAN' && typeof v.value === 'boolean') {
      out[key] = { type: 'BOOLEAN', value: v.value };
    } else if (t === 'TEXT' && typeof v.value === 'string') {
      out[key] = { type: 'TEXT', value: v.value };
    } else if (t === 'VARIANT' && typeof v.value === 'string') {
      out[key] = { type: 'VARIANT', value: v.value };
    } else if (t === 'INSTANCE_SWAP' && typeof v.value === 'string') {
      out[key] = { type: 'INSTANCE_SWAP', value: v.value };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapLayoutExtras(props: Record<string, unknown>): Partial<LayoutSelfFields> {
  const c = mapConstraints(props);
  return {
    ...mapMinMax(props),
    ...mapGridChild(props),
    ...(c ? { constraints: c } : {}),
  };
}
