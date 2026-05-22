import type {
  BlendMode,
  ComponentOverrideFields,
  ComponentPropertyDefinition,
  ComponentPropertyValue,
  FrameNode,
  LayoutConstraints,
  LayoutSelfFields,
  Paint,
  TextNode,
} from '../model/types.js';
import type { FigmaIdMap } from './idMap.js';
import { normalizeLayoutConstraints, normalizeLayoutGrids } from '../engine/figmaInterop.js';
import {
  mapImportedFrameAutoLayoutScalars,
  mapImportedFrameLayoutProps,
} from '../engine/frameLayoutFields.js';
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
  mapEffectsPreservingEmpty,
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
  'mainComponentId',
  'componentKey',
  'componentProperties',
  'componentPropertyReferences',
  'componentPropertyDefinitions',
  'overrides',
  'scaleFactor',
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
  const mapperOpts = { optStr, optNum, prop, normalizeLayoutGrids };
  return {
    ...mapImportedFrameAutoLayoutScalars(props, mapperOpts),
    ...mapImportedFrameLayoutProps(props, frameWidth, mapperOpts),
  };
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
  const tc = lenientParse(() => parseTextCase(prop(props, 'textCase'), 'textCase'));
  if (tc) out.textCase = tc;
  const td = lenientParse(() => parseTextDecoration(prop(props, 'textDecoration'), 'textDecoration'));
  if (td) out.textDecoration = td;
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
  return out.length > 0 ? out : [];
}

/** Preserves `[]` when Figma explicitly clears paints on an instance (tri-state import). */
export function mapPaintsPreservingEmpty(
  raw: unknown,
  imageHashRemap: (figmaHash: string) => string | undefined,
  idMap: FigmaIdMap
): Paint[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return mapPaints(raw, imageHashRemap);
  if (raw.length === 0) return [];
  return mapPaintsExtended(raw, imageHashRemap, idMap) ?? [];
}

function mapOverrideEntry(
  o: Record<string, unknown>,
  imageHashRemap: (figmaHash: string) => string | undefined,
  idMap: FigmaIdMap
): ComponentOverrideFields {
  const entry: ComponentOverrideFields = {};
  if (typeof o.characters === 'string') entry.characters = o.characters;
  const fs = optNum(o.fontSize);
  if (fs !== undefined) entry.fontSize = fs;
  const fw = optNum(o.fontWeight);
  if (fw !== undefined) entry.fontWeight = fw;
  if (typeof o.visible === 'boolean') entry.visible = o.visible;
  const op = optNum(o.opacity);
  if (op !== undefined) entry.opacity = op;
  const ha = optStr(o.textAlignHorizontal);
  if (ha === 'LEFT' || ha === 'CENTER' || ha === 'RIGHT' || ha === 'JUSTIFIED') {
    entry.textAlignHorizontal = ha;
  }
  const va = optStr(o.textAlignVertical);
  if (va === 'TOP' || va === 'CENTER' || va === 'BOTTOM') entry.textAlignVertical = va;
  const tar = optStr(o.textAutoResize);
  if (tar === 'NONE' || tar === 'WIDTH_AND_HEIGHT' || tar === 'HEIGHT' || tar === 'TRUNCATE') {
    entry.textAutoResize = tar;
  }
  const lm = optStr(o.layoutMode);
  if (lm === 'NONE' || lm === 'HORIZONTAL' || lm === 'VERTICAL' || lm === 'GRID') entry.layoutMode = lm;
  const pl = optNum(o.paddingLeft);
  if (pl !== undefined) entry.paddingLeft = pl;
  const pr = optNum(o.paddingRight);
  if (pr !== undefined) entry.paddingRight = pr;
  const pt = optNum(o.paddingTop);
  if (pt !== undefined) entry.paddingTop = pt;
  const pb = optNum(o.paddingBottom);
  if (pb !== undefined) entry.paddingBottom = pb;
  const is_ = optNum(o.itemSpacing);
  if (is_ !== undefined) entry.itemSpacing = is_;
  if ('fills' in o) entry.fills = mapPaintsPreservingEmpty(o.fills, imageHashRemap, idMap) ?? [];
  if ('strokes' in o) entry.strokes = mapPaintsPreservingEmpty(o.strokes, imageHashRemap, idMap) ?? [];
  if ('effects' in o) entry.effects = mapEffectsPreservingEmpty(o.effects) ?? [];
  if ('backgrounds' in o) entry.backgrounds = mapPaintsPreservingEmpty(o.backgrounds, imageHashRemap, idMap) ?? [];
  return entry;
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
    const entry = mapOverrideEntry(val as Record<string, unknown>, imageHashRemap, idMap);
    if (Object.keys(entry).length > 0) {
      const hfcId = idMap.get(figmaNodeId) ?? idMap.allocate(figmaNodeId);
      out[hfcId] = entry;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const COMPONENT_PROPERTY_REFERENCE_FIELDS = new Set([
  'visible',
  'characters',
  'mainComponent',
  'fontSize',
  'textAlignHorizontal',
]);

export function mapComponentPropertyReferences(
  raw: unknown
): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [field, propName] of Object.entries(raw as Record<string, unknown>)) {
    if (!COMPONENT_PROPERTY_REFERENCE_FIELDS.has(field)) continue;
    if (typeof propName !== 'string' || propName.length === 0) continue;
    out[field] = propName;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapComponentPropertyDefinitions(
  raw: unknown
): Record<string, ComponentPropertyDefinition> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, ComponentPropertyDefinition> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== 'object') continue;
    const v = val as Record<string, unknown>;
    const t = v.type;
    if (t === 'BOOLEAN' && typeof v.defaultValue === 'boolean') {
      out[key] = { type: 'BOOLEAN', defaultValue: v.defaultValue };
    } else if (t === 'TEXT' && typeof v.defaultValue === 'string') {
      out[key] = { type: 'TEXT', defaultValue: v.defaultValue };
    } else if (t === 'VARIANT') {
      const opts = v.variantOptions;
      out[key] = {
        type: 'VARIANT',
        defaultValue: typeof v.defaultValue === 'string' ? v.defaultValue : '',
        variantOptions: Array.isArray(opts) ? opts.filter((o): o is string => typeof o === 'string') : [],
      };
    } else if (t === 'INSTANCE_SWAP') {
      const pv = v.preferredValues;
      out[key] = {
        type: 'INSTANCE_SWAP',
        ...(Array.isArray(pv)
          ? { preferredValues: pv.filter((o): o is string => typeof o === 'string') }
          : {}),
      };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mapComponentProperties(
  raw: unknown,
  idMap?: FigmaIdMap
): Record<string, ComponentPropertyValue> | undefined {
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
      const figmaComponentId = v.value;
      const hfcId = idMap ? (idMap.get(figmaComponentId) ?? idMap.allocate(figmaComponentId)) : figmaComponentId;
      out[key] = { type: 'INSTANCE_SWAP', value: hfcId };
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
