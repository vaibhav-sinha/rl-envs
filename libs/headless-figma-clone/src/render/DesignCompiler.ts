import {
  applyAutoLayoutIntrinsicSizingDeep,
  effectiveVerticalItemSpacingPx,
  syncHugTextLayoutMetricsDeep,
} from './autoLayoutIntrinsicSizing.js';
import {
  booleanOperandPathD,
  clampRectCornerRadiiToBox,
  computeBooleanPathData,
  rectCornerRadii,
  resolveBooleanDisplayFill,
} from './booleanPaths.js';
import { ellipseArcPathD, ellipsePathD, isPlainFullEllipse } from './shapePaths.js';
import { linearGradientCss, radialGradientCss, svgLinearGradientEndpoints, svgRadialGradientAttrs } from './gradientCss.js';
import {
  buildPatternTileSvgDataUrl,
  buildSyncPatternTileDataUrl,
  findSceneNode as findPatternSceneNode,
  patternBackgroundPosition,
  patternRepeatCellSize,
} from './patternTiles.js';
import { flexChildLayoutCss, constraintPositionCss } from '../layout/flexChildCss.js';
import { frameGridInnerStyle, isGridFrame } from '../layout/gridLayout.js';
import { allEffectsCss, type EffectResolveContext } from './effectsCss.js';
import {
  effectiveTextBaseFontSizePx,
  effectiveTextMaxFontSizePx,
  fontFamilyCssFromName,
  hugTextLineHeightPxFromTypography,
  leadingTrimCss,
  listContainerCss,
  mergeTypographyFromText,
  openTypeFeaturesCss,
  paragraphTypographyCss,
} from './typographyCss.js';
import { computeStrokeBorder, rgbaFromSolid as strokeRgbaFromSolid } from './strokeRender.js';
import { svgViewportForPathData, svgViewportForVectorPaths } from './vectorPathBounds.js';
import {
  buildRootCssVariableBlock,
  cssVarNameForVariable,
  findVariableDefinition,
  resolveVariableToFloat,
  resolveVariableToRgb,
  resolveVariableToStringValue,
} from '../variables/resolution.js';
import type {
  BlendMode,
  BooleanOperationNode,
  ComponentInstanceNode,
  ComponentNode,
  ComponentSetNode,
  InstanceNode,
  Effect,
  EllipseNode,
  FileEnvelope,
  DocumentNode,
  FrameNode,
  PageNode,
  LineNode,
  Paint,
  PatternPaint,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SolidPaint,
  StarNode,
  StyledSegment,
  TableNode,
  TextNode,
  TransformGroupNode,
  GroupNode,
  LayoutConstraints,
  VectorNode,
} from '../model/types.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CompiledDesign {
  html: string;
  css: string;
  warnings: string[];
  bounds: Rect;
  /** Requested root node border box in viewport CSS px (after padding + shift). */
  rootClip: Rect;
  viewportWidth: number;
  viewportHeight: number;
}

export type CompileHtmlOptions = {
  viewportPaddingPx: number;
  includeCss: boolean;
  inlineCss: boolean;
  /** Resolved `data:` URLs for `ImagePaint.imageHash` (Playwright / offline HTML). */
  imageDataUrlByHash?: Record<string, string>;
  /** Rasterized pattern source tiles (`sourceNodeId` → data URL). */
  patternTileDataUrlByNodeId?: Record<string, string>;
};

/** Scoped UA reset so Playwright screenshots only show explicit compiled styles. */
export const HFC_UA_RESET_CSS = [
  'html,body{margin:0;padding:0;}',
  '#hfc-root,#hfc-root *{box-sizing:border-box;}',
  '#hfc-root img,#hfc-root svg{display:block;}',
  '#hfc-root p,#hfc-root h1,#hfc-root h2,#hfc-root h3,#hfc-root h4,#hfc-root h5,#hfc-root h6,#hfc-root ul,#hfc-root ol,#hfc-root li,#hfc-root figure,#hfc-root blockquote{margin:0;padding:0;}',
  '#hfc-root ul,#hfc-root ol{list-style:none;}',
  '#hfc-root a,#hfc-root a:link,#hfc-root a:visited,#hfc-root a:hover,#hfc-root a:active{color:inherit;text-decoration:none;}',
].join('');

/** Active component-instance ids while emitting cloned master subtrees (avoids master-id CSS collisions). */
const instanceCssScopeStack: string[] = [];

function currentInstanceCssScope(): string | undefined {
  return instanceCssScopeStack.at(-1);
}

/** Descendant selector; scoped under a component instance to avoid master-id CSS collisions. */
function hfcNodeCssSel(nodeId: string, instanceScopeId = currentInstanceCssScope()): string {
  return instanceScopeId ? `.hfc-node-${instanceScopeId} .hfc-node-${nodeId}` : `.hfc-node-${nodeId}`;
}

function withInstanceCssScope<T>(instanceId: string, fn: () => T): T {
  instanceCssScopeStack.push(instanceId);
  try {
    return fn();
  } finally {
    instanceCssScopeStack.pop();
  }
}

export interface DesignCompiler {
  compileSubtree(params: {
    envelope: FileEnvelope;
    rootNodeId: string;
    options: CompileHtmlOptions;
  }): CompiledDesign;
  /** All top-level scene nodes on a page (defaults to first page when `pageId` omitted). */
  compileFirstPage(params: {
    envelope: FileEnvelope;
    options: CompileHtmlOptions;
    pageId?: string;
  }): CompiledDesign;
}

function findSceneNode(envelope: FileEnvelope, id: string): SceneNode | null {
  for (const page of envelope.document.children) {
    const hit = findSceneInList(page.children, id);
    if (hit) return hit;
  }
  return null;
}

function findPageForSceneNode(envelope: FileEnvelope, sceneNodeId: string): PageNode | null {
  for (const page of envelope.document.children) {
    if (page.type !== 'PAGE') continue;
    if (findSceneInList(page.children, sceneNodeId)) return page;
  }
  return null;
}

/** Resolve a PAGE by id (document direct child). */
export function findPageById(envelope: FileEnvelope, pageId: string): PageNode | null {
  const page = envelope.document.children.find((c): c is PageNode => c.type === 'PAGE' && c.id === pageId);
  return page ?? null;
}

function pageCanvasDimensions(page: PageNode): { width: number; height: number } {
  const width = typeof page.width === 'number' && page.width > 0 ? page.width : 100;
  const height = typeof page.height === 'number' && page.height > 0 ? page.height : 100;
  return { width, height };
}

function compilePageCanvasOnly(
  page: PageNode,
  options: CompileHtmlOptions,
  envelope: FileEnvelope
): CompiledDesign {
  const pad = options.viewportPaddingPx;
  const { width: contentW, height: contentH } = pageCanvasDimensions(page);
  const W = contentW + 2 * pad;
  const H = contentH + 2 * pad;
  const warnings: string[] = [];
  const cssParts: string[] = [];
  const rootVarCss = buildRootCssVariableBlock(envelope);
  if (rootVarCss) {
    cssParts.push(rootVarCss);
  }
  const imgMap = options.imageDataUrlByHash ?? {};
  const patternTiles = options.patternTileDataUrlByNodeId ?? {};
  const pageBg =
    page.backgrounds?.[0] && page.backgrounds[0].visible !== false
      ? fillBackgroundStyles(page.backgrounds[0], imgMap, patternTiles, warnings, 'page_canvas', envelope)
      : '';
  const cssBlock = `${HFC_UA_RESET_CSS}\n#hfc-root{position:relative;width:${String(W)}px;height:${String(H)}px;isolation:isolate;${pageBg}}\n${cssParts.join('\n')}`;
  const inline = options.inlineCss;
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
${inline ? cssBlock : '/* css attached separately */'}
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:${String(W)}px;height:${String(H)}px;">
    </div>
  </body>
</html>`;
  const rootClip = { x: pad, y: pad, width: contentW, height: contentH };
  return {
    html,
    css: inline ? '' : cssBlock,
    warnings,
    bounds: { x: 0, y: 0, width: contentW, height: contentH },
    rootClip,
    viewportWidth: W,
    viewportHeight: H,
  };
}

function compilePageNode(page: PageNode, options: CompileHtmlOptions, envelope: FileEnvelope): CompiledDesign {
  if (page.children.length === 0) {
    return compilePageCanvasOnly(page, options, envelope);
  }
  const roots = filterPageCompileRoots(page.children, envelope);
  return compileRootScenes(roots, options, envelope, page.backgrounds);
}

/** Component master root frames are stored for instances but must not paint as page-level scenes. */
function collectComponentRootFrameIds(env: FileEnvelope): Set<string> {
  const ids = new Set<string>();
  if (env.components) {
    for (const c of env.components) ids.add(c.root.id);
  }
  const walk = (nodes: SceneNode[]): void => {
    for (const n of nodes) {
      if (n.type === 'COMPONENT') ids.add(n.rootFrameId);
      const ch = sceneChildList(n);
      if (ch) walk(ch);
    }
  };
  for (const page of env.document.children) {
    if (page.type === 'PAGE') walk(page.children);
  }
  return ids;
}

function filterPageCompileRoots(roots: SceneNode[], env: FileEnvelope): SceneNode[] {
  const masterRootIds = collectComponentRootFrameIds(env);
  return roots.filter((n) => {
    if (n.type === 'FRAME' && masterRootIds.has(n.id)) return false;
    if (n.type === 'COMPONENT') return false;
    return true;
  });
}

function sceneChildList(n: SceneNode): SceneNode[] | null {
  if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') return n.children;
  if (n.type === 'BOOLEAN_OPERATION') return n.children;
  return null;
}

/** Numeric part of internal ids (`I12` → 12). Used for Figma-like global stacking under nested groups. */
function internalIdSeq(id: string): number {
  const m = /^I(\d+)$/.exec(id);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/** SVG mask markup for a Figma mask node (vector path or bounding rect). */
function maskShapeSvgMarkup(maskNode: SceneNode, parentW: number, parentH: number, maskId: string): string {
  const mx = maskNode.x;
  const my = maskNode.y;
  const mw = maskNode.width;
  const mh = maskNode.height;
  const head = `mask id="${escapeAttr(maskId)}" maskUnits="userSpaceOnUse" x="0" y="0" width="${String(parentW)}" height="${String(parentH)}"`;
  if (maskNode.type === 'VECTOR' && maskNode.vectorPaths?.[0]?.data) {
    const d = maskNode.vectorPaths[0].data;
    return `<${head}><path d="${escapeAttr(d)}" fill="white" transform="translate(${String(mx)},${String(my)})"/></mask>`;
  }
  const d = operandPathD(maskNode);
  if (d && d !== 'M0,0') {
    return `<${head}><path d="${escapeAttr(d)}" fill="white" transform="translate(${String(mx)},${String(my)})"/></mask>`;
  }
  return `<${head}><rect x="${String(mx)}" y="${String(my)}" width="${String(mw)}" height="${String(mh)}" fill="white"/></mask>`;
}

function sceneChildPos(
  n: SceneNode,
  insideFlex: boolean,
  absX: number,
  absY: number,
  parentFrame?: FrameNode
): string {
  return flexChildLayoutCss(n, insideFlex, { absX, absY, width: n.width, height: n.height }, parentFrame);
}

function findSceneInList(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const ch = sceneChildList(n);
    if (ch) {
      const inner = findSceneInList(ch, id);
      if (inner) return inner;
    }
  }
  return null;
}

function rgbaFromSolid(p: SolidPaint): string {
  const { r, g, b } = p.color;
  const a = p.opacity !== undefined ? p.opacity : 1;
  return `rgba(${String(Math.round(r * 255))},${String(Math.round(g * 255))},${String(Math.round(b * 255))},${String(a)})`;
}

function rgbaFromRgba(c: { r: number; g: number; b: number; a?: number }): string {
  const a = c.a !== undefined ? c.a : 1;
  return `rgba(${String(Math.round(c.r * 255))},${String(Math.round(c.g * 255))},${String(Math.round(c.b * 255))},${String(a)})`;
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtmlText(s).replace(/'/g, '&#39;');
}

function paintColorCss(fill: Paint | undefined, _env: FileEnvelope, fallback: string, warnings: string[], label: string): string {
  if (!fill || fill.visible === false) return fallback;
  if (fill.type === 'SOLID') return rgbaFromSolid(fill);
  if (fill.type === 'VARIABLE_COLOR') {
    return `var(${cssVarNameForVariable(fill.variableId)})`;
  }
  warnings.push(`paint_color_unsupported:${label}`);
  return fallback;
}

function boundFloatCss(
  env: FileEnvelope,
  variableId: string | undefined,
  fallbackPx: number,
  nodeModeOverrides?: Record<string, string>
): string {
  if (!variableId) return `${String(fallbackPx)}px`;
  const v = resolveVariableToFloat(env, variableId, nodeModeOverrides);
  if (v === null) return `${String(fallbackPx)}px`;
  return `var(${cssVarNameForVariable(variableId)},${String(fallbackPx)}px)`;
}

function effectResolveCtx(
  env: FileEnvelope,
  node?: { explicitVariableModes?: Record<string, string> }
): EffectResolveContext {
  return { env, nodeModeOverrides: node?.explicitVariableModes };
}

function nodeEffectsCss(
  effects: Effect[] | undefined,
  env: FileEnvelope,
  node: { id: string; explicitVariableModes?: Record<string, string> },
  warnings: string[],
  labelPrefix: string
): string {
  return allEffectsCss(effects, effectResolveCtx(env, node), warnings, `${labelPrefix}:${node.id}`);
}

/** SVG presentation `font-size` uses unitless user units (not `px` suffix). */
function fontSizeForSvgText(env: FileEnvelope, t: TextNode, fallbackPx: number): string {
  const vid = t.boundVariables?.fontSize;
  if (!vid) return String(fallbackPx);
  const v = resolveVariableToFloat(env, vid);
  const fb = v !== null ? v : fallbackPx;
  return `var(${cssVarNameForVariable(vid)},${String(fb)})`;
}

function effectiveTextBase(t: TextNode, env: FileEnvelope): { fontSize: number; fontWeight: number; fills: Paint[] | undefined; fontSizeCss: string } {
  let fontSize = effectiveTextBaseFontSizePx(t, env);
  let fontWeight = t.fontWeight ?? 400;
  let fills = t.fills;
  if (t.textStyleId) {
    const st = env.textStyles?.find((s) => s.id === t.textStyleId);
    if (st) {
      if (st.fontWeight !== undefined) fontWeight = st.fontWeight;
      if (st.fills?.length) fills = st.fills;
    }
  }
  const fontSizeCss = boundFloatCss(env, t.boundVariables?.fontSize, fontSize);
  return { fontSize, fontWeight, fills, fontSizeCss };
}

/** Map Figma `textAlignVertical` / `textAlignHorizontal` to a column flex box (defaults TOP + LEFT match Figma). */
function textFlexContainerCss(t: TextNode, ellip: boolean): string {
  const v = t.textAlignVertical ?? 'TOP';
  const h = t.textAlignHorizontal ?? 'LEFT';
  const jc = v === 'CENTER' ? 'center' : v === 'BOTTOM' ? 'flex-end' : 'flex-start';
  let ai: string;
  if (ellip) ai = 'stretch';
  else if (h === 'CENTER') ai = 'center';
  else if (h === 'RIGHT') ai = 'flex-end';
  else if (h === 'JUSTIFIED') ai = 'stretch';
  else ai = 'flex-start';
  return `display:flex;flex-direction:column;justify-content:${jc};align-items:${ai};min-height:0;`;
}

function textInnerHorizontalCss(t: TextNode): string {
  const h = t.textAlignHorizontal ?? 'LEFT';
  if (h === 'CENTER') return 'text-align:center;';
  if (h === 'RIGHT') return 'text-align:right;';
  if (h === 'JUSTIFIED') return 'text-align:justify;';
  return 'text-align:left;';
}

/** Figma: `HEIGHT` auto-resize wraps; a single-line hug box clips horizontally instead of wrapping. */
function textIsSingleLineBox(t: TextNode, env: FileEnvelope): boolean {
  if (t.textOnPath) return false;
  if (t.characters.includes('\n')) return false;
  if (t.textTruncation === 'DISABLED') return false;
  if (t.textAutoResize === 'HEIGHT') return false;
  if (t.textTruncation === 'ENDING' && t.maxLines != null && t.maxLines > 1) return false;
  if (t.textAutoResize === 'TRUNCATE') return true;
  if (t.textTruncation === 'ENDING' && t.maxLines === 1) return true;
  const fs = effectiveTextMaxFontSizePx(t, env);
  const lineH = hugTextLineHeightPxFromTypography(fs, t.lineHeight);
  const cap = Math.ceil(lineH * 1.14);
  /** Designers often pad label boxes a few px above one line (e.g. 12px type in a 20px chip). */
  const heightSlack = Math.min(4, Math.max(2, Math.ceil(fs * 0.25)));
  return t.height > 0 && t.height <= cap + heightSlack;
}

function textFlowCss(t: TextNode, env: FileEnvelope): string {
  if (textIsSingleLineBox(t, env)) {
    const wantsEllipsis =
      t.textAutoResize === 'TRUNCATE' ||
      (t.textTruncation === 'ENDING' && (t.maxLines === 1 || t.maxLines == null));
    const tail = wantsEllipsis ? 'text-overflow:ellipsis;' : 'text-overflow:clip;';
    return `white-space:pre;overflow:hidden;${tail}word-break:normal;overflow-wrap:normal;`;
  }
  if (t.textTruncation === 'ENDING' && t.maxLines != null && t.maxLines > 1) {
    return `display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${String(t.maxLines)};overflow:hidden;white-space:pre-wrap;word-break:break-word;`;
  }
  return 'white-space:pre-wrap;word-break:break-word;';
}

function effectiveTextCharacters(t: TextNode, env: FileEnvelope): string {
  const vid = t.boundVariables?.characters;
  if (!vid) return t.characters;
  const s = resolveVariableToStringValue(env, vid);
  return s ?? t.characters;
}

function effectiveRectFills(r: RectangleNode, env: FileEnvelope): Paint[] {
  if (r.fills?.length) return r.fills;
  if (r.fillStyleId) {
    const ps = env.paintStyles?.find((p) => p.id === r.fillStyleId);
    return ps?.paints ?? [];
  }
  return [];
}

function effectiveRectEffects(r: RectangleNode, env: FileEnvelope): Effect[] | undefined {
  if (r.effects?.length) return r.effects;
  if (r.effectStyleId) {
    const st = env.effectStyles?.find((s) => s.id === r.effectStyleId);
    if (st?.effects?.length) return st.effects;
  }
  return r.effects;
}

function effectiveFrameFills(f: FrameNode, env: FileEnvelope): Paint[] {
  if (f.fills?.length) return f.fills;
  if (f.fillStyleId) {
    const ps = env.paintStyles?.find((p) => p.id === f.fillStyleId);
    return ps?.paints ?? [];
  }
  return f.fills ?? [];
}

function effectiveFrameStrokes(f: FrameNode, env: FileEnvelope): Paint[] {
  if (f.strokes?.length) return f.strokes;
  if (f.strokeStyleId) {
    const ps = env.paintStyles?.find((p) => p.id === f.strokeStyleId);
    return ps?.paints ?? [];
  }
  return f.strokes ?? [];
}

function effectiveFrameEffects(f: FrameNode, env: FileEnvelope): Effect[] | undefined {
  if (f.effects?.length) return f.effects;
  if (f.effectStyleId) {
    const st = env.effectStyles?.find((s) => s.id === f.effectStyleId);
    if (st?.effects?.length) return st.effects;
  }
  return f.effects;
}

function effectiveTextEffects(t: TextNode, env: FileEnvelope): Effect[] | undefined {
  if (t.effects?.length) return t.effects;
  if (t.effectStyleId) {
    const st = env.effectStyles?.find((s) => s.id === t.effectStyleId);
    if (st?.effects?.length) return st.effects;
  }
  return t.effects;
}

function patternPaintCss(
  fill: PatternPaint,
  env: FileEnvelope,
  patternTiles: Record<string, string>,
  warnings: string[],
  label: string
): string {
  const src = findPatternSceneNode(env, fill.sourceNodeId);
  if (!src || !('width' in src) || !('height' in src)) {
    warnings.push(`pattern_source_missing:${label}`);
    return 'background-color:transparent;';
  }
  const tileUrl =
    patternTiles[fill.sourceNodeId] ??
    buildPatternTileSvgDataUrl(env, fill) ??
    buildSyncPatternTileDataUrl(env, fill.sourceNodeId);
  if (!tileUrl) {
    warnings.push(`pattern_tile_missing:${label}`);
    return 'background-color:transparent;';
  }
  const { stepX, stepY } = patternRepeatCellSize(fill, src.width, src.height);
  const pos = patternBackgroundPosition(fill.horizontalAlignment, fill.verticalAlignment);
  return `background-image:url("${escapeAttr(tileUrl)}");background-size:${String(stepX)}px ${String(stepY)}px;background-repeat:repeat;background-position:${pos};background-color:transparent;`;
}

/** Figma stacks fills bottom-to-top; CSS lists the first background-image on top. */
function stackedFillsCss(
  fills: Paint[],
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  label: string,
  env: FileEnvelope
): string {
  const visible = fills.filter((f) => f.visible !== false);
  if (!visible.length) return 'background-color:transparent;';
  if (visible.length === 1) return fillBackgroundStyles(visible[0]!, imgMap, patternTiles, warnings, label, env);

  const images: string[] = [];
  const sizes: string[] = [];
  const positions: string[] = [];
  const repeats: string[] = [];

  const pushPaintLayer = (img: string) => {
    images.push(img);
    sizes.push('100% 100%');
    positions.push('0% 0%');
    repeats.push('no-repeat');
  };

  for (let i = visible.length - 1; i >= 0; i--) {
    const fill = visible[i]!;
    if (fill.type === 'PATTERN') {
      return patternPaintCss(fill, env, patternTiles, warnings, label);
    }
    if (fill.type === 'SOLID') {
      pushPaintLayer(`linear-gradient(${rgbaFromSolid(fill)}, ${rgbaFromSolid(fill)})`);
      continue;
    }
    if (fill.type === 'GRADIENT_LINEAR') {
      pushPaintLayer(linearGradientCss(fill));
      continue;
    }
    if (fill.type === 'GRADIENT_RADIAL') {
      pushPaintLayer(radialGradientCss(fill));
      continue;
    }
    if (fill.type === 'IMAGE') {
      const url = imgMap[fill.imageHash];
      if (!url) {
        warnings.push(`missing_image_data_url:${label}:${fill.imageHash}`);
        continue;
      }
      let size = 'cover';
      if (fill.scaleMode === 'FIT') size = 'contain';
      if (fill.scaleMode === 'STRETCH') size = '100% 100%';
      if (fill.scaleMode === 'TILE') size = 'auto';
      const repeat = fill.scaleMode === 'TILE' ? 'repeat' : 'no-repeat';
      images.push(`url("${escapeAttr(url)}")`);
      sizes.push(size);
      positions.push('center');
      repeats.push(repeat);
      continue;
    }
    if (fill.type === 'VARIABLE_COLOR') {
      const v = resolveVariableToRgb(env, fill.variableId);
      const layerColor = v
        ? `rgba(${String(Math.round(v.r * 255))},${String(Math.round(v.g * 255))},${String(Math.round(v.b * 255))},1)`
        : `var(${cssVarNameForVariable(fill.variableId)})`;
      if (!v) warnings.push(`missing_variable_color:${label}:${fill.variableId}`);
      pushPaintLayer(`linear-gradient(${layerColor}, ${layerColor})`);
    }
  }
  if (!images.length) return 'background-color:transparent;';
  return `background-image:${images.join(',')};background-size:${sizes.join(',')};background-position:${positions.join(',')};background-repeat:${repeats.join(',')};background-color:transparent;`;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

function sceneNodeBounds(n: SceneNode, originX: number, originY: number): Bounds {
  const absX = originX + n.x;
  const absY = originY + n.y;
  const rot = n.rotation ?? 0;
  if (rot !== 0) {
    const corners = [
      { px: 0, py: 0 },
      { px: n.width, py: 0 },
      { px: n.width, py: n.height },
      { px: 0, py: n.height },
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const c of corners) {
      const r = rotatePointFigma(0, 0, c.px, c.py, rot);
      minX = Math.min(minX, absX + r.x);
      minY = Math.min(minY, absY + r.y);
      maxX = Math.max(maxX, absX + r.x);
      maxY = Math.max(maxY, absY + r.y);
    }
    return { minX, minY, maxX, maxY };
  }
  return {
    minX: absX,
    minY: absY,
    maxX: absX + n.width,
    maxY: absY + n.height,
  };
}

function measureScene(n: SceneNode, originX: number, originY: number): Bounds {
  let b = sceneNodeBounds(n, originX, originY);
  if (n.type === 'SECTION') return b;
  const childOriginX = originX + n.x;
  const childOriginY = originY + n.y;
  const ch = sceneChildList(n);
  if (ch) {
    for (const c of ch) {
      b = unionBounds(b, measureScene(c, childOriginX, childOriginY));
    }
  }
  return b;
}

function frameNeedsLayeredBackground(f: FrameNode): boolean {
  return (f.backgrounds?.length ?? 0) > 0;
}

function mixBlendCss(m: BlendMode | undefined): string {
  if (!m || m === 'PASS_THROUGH' || m === 'NORMAL') return '';
  const map: Partial<Record<BlendMode, string>> = {
    MULTIPLY: 'multiply',
    SCREEN: 'screen',
    OVERLAY: 'overlay',
    DARKEN: 'darken',
    LIGHTEN: 'lighten',
    COLOR_DODGE: 'color-dodge',
    COLOR_BURN: 'color-burn',
    HARD_LIGHT: 'hard-light',
    SOFT_LIGHT: 'soft-light',
    DIFFERENCE: 'difference',
    EXCLUSION: 'exclusion',
    HUE: 'hue',
    SATURATION: 'saturation',
    COLOR: 'color',
    LUMINOSITY: 'luminosity',
  };
  const v = map[m];
  return v ? `mix-blend-mode:${v};` : '';
}

/** Rotate a point with Figma's relativeTransform matrix (positive deg = CCW in y-down space). */
function rotatePointFigma(cx: number, cy: number, px: number, py: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos + dy * sin, y: cy - dx * sin + dy * cos };
}

function transformOpacityCss(n: SceneNode, opts?: { skipRotation?: boolean }): string {
  let s = '';
  if (!opts?.skipRotation && n.rotation !== undefined && n.rotation !== 0) {
    // Pivot at node top-left (Figma Plugin API). Negate angle: Figma +θ is CCW in y-down,
    // CSS rotate(+θ) is CW — use rotate(-θ) so visual direction matches Figma.
    s += `transform:rotate(${String(-n.rotation)}deg);transform-origin:top left;`;
  }
  if (n.opacity !== undefined && n.opacity !== 1) {
    s += `opacity:${String(n.opacity)};`;
  }
  if (n.visible === false) {
    s += 'display:none;';
  }
  s += mixBlendCss(n.blendMode);
  return s;
}

function fillBackgroundStyles(
  fill: Paint | undefined,
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  label: string,
  env: FileEnvelope
): string {
  if (!fill || fill.visible === false) return 'background-color:transparent;';
  if (fill.type === 'SOLID') return `background-color:${rgbaFromSolid(fill)};`;
  if (fill.type === 'VARIABLE_COLOR') {
    const v = resolveVariableToRgb(env, fill.variableId);
    const def = findVariableDefinition(env, fill.variableId);
    const isAlias = Boolean(def?.variable.aliasOfVariableId);
    if (isAlias && v) {
      return `background-color:rgba(${String(Math.round(v.r * 255))},${String(Math.round(v.g * 255))},${String(
        Math.round(v.b * 255)
      )},1);`;
    }
    if (!v) {
      warnings.push(`missing_variable_color:${label}:${fill.variableId}`);
      return `background-color:var(${cssVarNameForVariable(fill.variableId)},transparent);`;
    }
    return `background-color:var(${cssVarNameForVariable(fill.variableId)});`;
  }
  if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
    const g = fill.type === 'GRADIENT_LINEAR' ? linearGradientCss(fill) : radialGradientCss(fill);
    return `background-image:${g};background-color:transparent;`;
  }
  if (fill.type === 'IMAGE') {
    const url = imgMap[fill.imageHash];
    if (!url) {
      warnings.push(`missing_image_data_url:${label}:${fill.imageHash}`);
      return 'background-color:transparent;';
    }
    let size = 'cover';
    if (fill.scaleMode === 'FIT') size = 'contain';
    if (fill.scaleMode === 'STRETCH') size = '100% 100%';
    if (fill.scaleMode === 'TILE') size = 'auto';
    return `background-image:url("${escapeAttr(url)}");background-size:${size};background-repeat:${fill.scaleMode === 'TILE' ? 'repeat' : 'no-repeat'};background-position:center;background-color:transparent;`;
  }
  if (fill.type === 'PATTERN') {
    return patternPaintCss(fill, env, patternTiles, warnings, label);
  }
  return 'background-color:transparent;';
}

function dashArrayAttr(n: { dashPattern?: number[] }): string {
  if (!n.dashPattern?.length) return '';
  return ` stroke-dasharray="${escapeAttr(n.dashPattern.map((x) => String(x)).join(' '))}"`;
}

function mapStrokeCapSvg(c: string | undefined): string {
  if (c === 'SQUARE') return 'square';
  if (c === 'NONE') return 'butt';
  return 'round';
}

function mapStrokeJoinSvg(j: string | undefined): string {
  if (j === 'BEVEL') return 'bevel';
  if (j === 'MITER') return 'miter';
  return 'round';
}

function svgStrokeAttrs(n: {
  strokes?: Paint[];
  strokeWeight?: number;
  strokeCap?: string;
  strokeJoin?: string;
}): string {
  const sw = n.strokeWeight ?? 0;
  const sp = n.strokes?.[0];
  if (!sp || sw <= 0 || sp.visible === false) return '';
  if (sp.type !== 'SOLID') return '';
  const cap = mapStrokeCapSvg(n.strokeCap);
  const jn = mapStrokeJoinSvg(n.strokeJoin);
  return `stroke="${escapeAttr(rgbaFromSolid(sp))}" stroke-width="${String(sw)}" stroke-linecap="${cap}" stroke-linejoin="${jn}"`;
}

function svgStrokeGradientDefs(stroke: Paint, gradId: string, w: number, h: number): string | null {
  if (stroke.type === 'GRADIENT_LINEAR') {
    const { x1, y1, x2, y2 } = svgLinearGradientEndpoints(stroke, w, h);
    let defs = `<linearGradient id="${escapeAttr(gradId)}" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">`;
    for (const st of stroke.gradientStops) {
      defs += `<stop offset="${String(st.position)}" stop-color="${escapeAttr(rgbaFromRgba(st.color))}"/>`;
    }
    defs += '</linearGradient>';
    return defs;
  }
  if (stroke.type === 'GRADIENT_RADIAL') {
    const ra = svgRadialGradientAttrs(stroke);
    const gt = ra.gradientTransform ? ` gradientTransform="${ra.gradientTransform}"` : '';
    let defs = `<radialGradient id="${escapeAttr(gradId)}" gradientUnits="objectBoundingBox" cx="${ra.cx}" cy="${ra.cy}" r="${ra.r}"${gt}>`;
    for (const st of stroke.gradientStops) {
      defs += `<stop offset="${String(st.position)}" stop-color="${escapeAttr(rgbaFromRgba(st.color))}"/>`;
    }
    defs += '</radialGradient>';
    return defs;
  }
  return null;
}

function listTypeForRange(
  t: TextNode,
  segs: StyledSegment[],
  start: number,
  end: number
): 'ORDERED' | 'UNORDERED' | null {
  for (const seg of segs) {
    if (seg.end <= start || seg.start >= end) continue;
    const type = seg.style.listOptions?.type;
    if (type === 'ORDERED' || type === 'UNORDERED') return type;
  }
  const nodeType = t.listOptions?.type;
  if (nodeType === 'ORDERED' || nodeType === 'UNORDERED') return nodeType;
  return null;
}

function emitTextInnerHtml(t: TextNode, env: FileEnvelope, warnings: string[], singleLine: boolean): string {
  const base = effectiveTextBase(t, env);
  const text = effectiveTextCharacters(t, env);
  const len = text.length;
  const segs = [...(t.styledSegments ?? [])].sort((a, b) => a.start - b.start || a.end - b.end);
  const defaultColor = paintColorCss(base.fills?.[0], env, 'rgba(0,0,0,1)', warnings, 'text_default');
  const defaultFsCss = base.fontSizeCss;
  const defaultFw = base.fontWeight;

  function spanStyle(style: StyledSegment['style'], excludeListLayout = false): string {
    const fs = style.fontSize ?? base.fontSize;
    const fsCss = style.fontSize !== undefined ? `${String(style.fontSize)}px` : defaultFsCss;
    const fw = style.fontWeight ?? defaultFw;
    const color = paintColorCss(style.fills?.[0], env, defaultColor, warnings, 'text_span');
    const typo = mergeTypographyFromText(t, style);
    return [
      `font-size:${fsCss}`,
      `font-weight:${String(fw)}`,
      `color:${color}`,
      fontFamilyCssFromName(style.fontName ?? t.fontName, style.boundVariables?.fontFamily ?? t.boundVariables?.fontFamily, env).replace(/;$/, ''),
      paragraphTypographyCss(typo, fs, env, { tightAutoLineHeight: singleLine, excludeListLayout })
        .replace(/;$/g, '')
        .split(';')
        .filter(Boolean)
        .join(';'),
      openTypeFeaturesCss(style.openTypeFeatures),
    ]
      .filter(Boolean)
      .join(';')
      .concat(';');
  }

  function emitSpanRange(start: number, end: number): string {
    let i = start;
    const chunks: string[] = [];
    let linkIdx = 0;
    for (const seg of segs) {
      if (seg.end <= start || seg.start >= end) continue;
      const segStart = Math.max(seg.start, start);
      const segEnd = Math.min(seg.end, end);
      if (segStart > i) {
        chunks.push(`<span style="${spanStyle({}, true)}">${escapeHtmlText(text.slice(i, segStart))}</span>`);
      }
      const slice = text.slice(segStart, segEnd);
      const inner = escapeHtmlText(slice);
      if (seg.style.hyperlink?.type === 'URL') {
        const link = seg.style.hyperlink as { type: 'URL'; url?: string; value?: string };
        const href = escapeAttr(link.url ?? link.value ?? '');
        chunks.push(
          `<a class="hfc-hyperlink hfc-hyperlink-${String(linkIdx)}" href="${href}" style="${spanStyle(seg.style, true)}">${inner}</a>`
        );
        linkIdx += 1;
      } else {
        chunks.push(`<span style="${spanStyle(seg.style, true)}">${inner}</span>`);
      }
      i = segEnd;
    }
    if (i < end) {
      chunks.push(`<span style="${spanStyle({}, true)}">${escapeHtmlText(text.slice(i, end))}</span>`);
    }
    if (chunks.length === 0) {
      chunks.push(`<span style="${spanStyle({}, true)}">${escapeHtmlText(text.slice(start, end))}</span>`);
    }
    return chunks.join('');
  }

  const listType = !singleLine && text.includes('\n') ? listTypeForRange(t, segs, 0, len) : null;
  if (listType) {
    const lines = text.split('\n');
    const listOpts = { type: listType } as const;
    const listCss = listContainerCss(listOpts, t.hangingList);
    const paraGap =
      t.paragraphSpacing !== undefined && t.paragraphSpacing > 0
        ? `margin-bottom:${String(t.paragraphSpacing)}px;`
        : '';
    const items: string[] = [];
    let offset = 0;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li]!;
      const lineStart = offset;
      const lineEnd = lineStart + line.length;
      const itemGap = li < lines.length - 1 ? paraGap : '';
      items.push(`<li class="hfc-list-item" style="display:list-item;${itemGap}">${emitSpanRange(lineStart, lineEnd)}</li>`);
      offset = lineEnd + 1;
    }
    const tag = listType === 'ORDERED' ? 'ol' : 'ul';
    return `<${tag} class="hfc-text-list" style="${listCss}">${items.join('')}</${tag}>`;
  }

  return emitSpanRange(0, len);
}

function polygonPointsD(n: number, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (-Math.PI / 2 + (i * 2 * Math.PI) / n) as number;
    const x = cx + rx * Math.cos(ang);
    const y = cy + ry * Math.sin(ang);
    pts.push(`${String(Math.round(x * 1000) / 1000)},${String(Math.round(y * 1000) / 1000)}`);
  }
  return `M${pts[0]} L${pts.slice(1).join(' L')} Z`;
}

function starPathD(points: number, innerR: number, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const ro = Math.min(w, h) / 2;
  const ri = ro * innerR;
  const seg = (2 * Math.PI) / (points * 2);
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const ang = -Math.PI / 2 + i * seg;
    const r = i % 2 === 0 ? ro : ri;
    const x = cx + r * Math.cos(ang);
    const y = cy + r * Math.sin(ang);
    parts.push(`${String(Math.round(x * 1000) / 1000)},${String(Math.round(y * 1000) / 1000)}`);
  }
  return `M${parts[0]} L${parts.slice(1).join(' L')} Z`;
}

function frameUsesFlexCss(f: FrameNode): boolean {
  return f.layoutMode === 'HORIZONTAL' || f.layoutMode === 'VERTICAL' || f.layoutMode === 'GRID';
}

/** Figma parity: auto-layout frames clip overflowing children unless `clipsContent === false`. */
function frameEffectiveClipsContent(f: FrameNode): boolean {
  if (f.clipsContent === false) return false;
  if (f.clipsContent === true) return true;
  return frameUsesFlexCss(f);
}

function frameCornerRadiusCss(f: FrameNode): string {
  const w = f.width;
  const h = f.height;
  const [tl0, tr0, br0, bl0] = rectCornerRadii(f as unknown as RectangleNode);
  const [tl, tr, br, bl] = clampRectCornerRadiiToBox(w, h, tl0, tr0, br0, bl0);
  if (tl <= 0 && tr <= 0 && br <= 0 && bl <= 0) return '';
  return tl === tr && tr === br && br === bl
    ? `border-radius:${String(tl)}px;`
    : `border-radius:${String(tl)}px ${String(tr)}px ${String(br)}px ${String(bl)}px;`;
}

function frameFlexWrapTracksStretch(f: FrameNode): boolean {
  const kids = f.children;
  if (!kids?.length) return false;
  return kids.every((c) => c.layoutAlign === 'STRETCH');
}

function frameFlexAlignContentCss(f: FrameNode): string {
  if (f.layoutWrap !== 'WRAP') return '';
  if (f.counterAxisAlignContent === 'SPACE_BETWEEN') {
    return 'align-content:space-between;';
  }
  if (f.counterAxisAlignContent !== 'AUTO' && f.counterAxisAlignContent !== undefined) {
    return '';
  }
  if (frameFlexWrapTracksStretch(f)) {
    return 'align-content:stretch;';
  }
  const ai = f.counterAxisAlignItems ?? 'MIN';
  const ac =
    ai === 'CENTER' ? 'center' : ai === 'MAX' ? 'flex-end' : 'flex-start';
  return `align-content:${ac};`;
}

function frameFlexGapCss(f: FrameNode, env: FileEnvelope): string {
  const modes = f.explicitVariableModes;
  const item =
    f.layoutMode === 'VERTICAL' && f.boundVariables?.itemSpacing === undefined
      ? effectiveVerticalItemSpacingPx(f)
      : (f.itemSpacing ?? 0);
  const itemCss = boundFloatCss(env, f.boundVariables?.itemSpacing, item, modes);
  if (f.layoutWrap !== 'WRAP') {
    return `gap:${itemCss};`;
  }
  const counter = f.counterAxisSpacing ?? item;
  const counterCss = boundFloatCss(env, f.boundVariables?.counterAxisSpacing, counter, modes);
  if (f.layoutMode === 'VERTICAL') {
    return `row-gap:${itemCss};column-gap:${counterCss};`;
  }
  return `column-gap:${itemCss};row-gap:${counterCss};`;
}

function frameFlexInnerStyle(f: FrameNode, env: FileEnvelope): string {
  if (isGridFrame(f)) {
    return frameGridInnerStyle(f, f.children, env);
  }
  const dir = f.layoutMode === 'VERTICAL' ? 'column' : 'row';
  const wrap = f.layoutWrap === 'WRAP' ? 'wrap' : 'nowrap';
  const pl = f.paddingLeft ?? 0;
  const pr = f.paddingRight ?? 0;
  const pt = f.paddingTop ?? 0;
  const pb = f.paddingBottom ?? 0;
  const modes = f.explicitVariableModes;
  const plCss = boundFloatCss(env, f.boundVariables?.paddingLeft, pl, modes);
  const prCss = boundFloatCss(env, f.boundVariables?.paddingRight, pr, modes);
  const ptCss = boundFloatCss(env, f.boundVariables?.paddingTop, pt, modes);
  const pbCss = boundFloatCss(env, f.boundVariables?.paddingBottom, pb, modes);
  const gapCss = frameFlexGapCss(f, env);
  const alignContentCss = frameFlexAlignContentCss(f);
  const jc =
    f.primaryAxisAlignItems === 'CENTER'
      ? 'center'
      : f.primaryAxisAlignItems === 'MAX'
        ? 'flex-end'
        : f.primaryAxisAlignItems === 'SPACE_BETWEEN'
          ? 'space-between'
          : 'flex-start';
  const ai =
    f.counterAxisAlignItems === 'CENTER'
      ? 'center'
      : f.counterAxisAlignItems === 'MAX'
        ? 'flex-end'
        : (f.counterAxisAlignItems as string | undefined) === 'STRETCH'
          ? 'stretch'
          : 'flex-start';
  return `display:flex;flex-direction:${dir};flex-wrap:${wrap};${gapCss}${alignContentCss}padding:${ptCss} ${prCss} ${pbCss} ${plCss};box-sizing:border-box;justify-content:${jc};align-items:${ai};`;
}

function rectPathLocal(r: RectangleNode): string {
  const w = r.width;
  const h = r.height;
  return `M0,0 H${String(w)} V${String(h)} H0 Z`;
}

function operandPathD(op: SceneNode): string {
  if (op.type === 'RECTANGLE') return rectPathLocal(op);
  if (op.type === 'VECTOR' && op.vectorPaths?.[0]?.data) return op.vectorPaths[0].data;
  if (op.type === 'POLYGON') return polygonPointsD(op.pointCount, op.width, op.height);
  if (op.type === 'STAR') return starPathD(op.pointCount, op.innerRadius, op.width, op.height);
  if (op.type === 'ELLIPSE') {
    return ellipsePathD(op.width, op.height, op.arcData);
  }
  return 'M0,0';
}

function emitBooleanOperation(
  b: BooleanOperationNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  _imgMap: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope
): void {
  const w = b.width;
  const h = b.height;
  const fill = resolveBooleanDisplayFill(b);
  const fillAttr =
    fill.type === 'SOLID' && (fill.visible === undefined || fill.visible)
      ? `fill="${escapeAttr(rgbaFromSolid(fill))}"`
      : 'fill="rgba(0,100,200,0.85)"';
  const shadow = nodeEffectsCss(b.effects, env, b, warnings, 'boolean');
  const pos = insideFlex
    ? `position:relative;left:0;top:0;flex:${String(b.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;`;
  htmlParts.push(`<div class="hfc-node-${b.id}" data-hfc-id="${b.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`${hfcNodeCssSel(b.id)}{${pos}width:${String(w)}px;height:${String(h)}px;box-sizing:border-box;${opRot}${shadow}}`);

  const boolPaths = computeBooleanPathData(b);
  if (!boolPaths.failed && boolPaths.pathData.length > 0) {
    const pathHtml = boolPaths.pathData
      .map((d) => `<path d="${escapeAttr(d)}" ${fillAttr} fill-rule="nonzero"/>`)
      .join('');
    htmlParts.push(
      `<svg class="hfc-boolean-svg" viewBox="0 0 ${String(w)} ${String(h)}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${pathHtml}</svg></div>`
    );
    return;
  }

  if (boolPaths.failed) {
    warnings.push(`boolean_op_failed:${b.id}:${b.booleanOperation}`);
  }

  const chunks = b.children
    .map((ch) => {
      const d0 = operandPathD(ch);
      return `<g transform="translate(${String(ch.x)},${String(ch.y)})"><path d="${escapeAttr(d0)}" ${fillAttr} fill-rule="nonzero"/></g>`;
    })
    .join('');
  htmlParts.push(
    `<svg class="hfc-boolean-svg" viewBox="0 0 ${String(w)} ${String(h)}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${chunks}</svg></div>`
  );
  warnings.push(`boolean_op_fallback:${b.id}:${b.booleanOperation}`);
}

function emitVector(
  v: VectorNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  _imgMap: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope
): void {
  const vp = v.vectorPaths.length > 0 ? svgViewportForVectorPaths(v.vectorPaths) : null;
  const w = Math.max(v.width, vp?.width ?? 0);
  const h = Math.max(v.height, vp?.height ?? 0);
  const viewBox = vp?.viewBox ?? `0 0 ${String(w)} ${String(h)}`;
  const fill = v.fills?.[0];
  let fillAttr = 'fill="transparent"';
  if (fill && fill.type === 'SOLID' && (fill.visible === undefined || fill.visible)) {
    fillAttr = `fill="${escapeAttr(rgbaFromSolid(fill))}"`;
  } else if (fill && (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL')) {
    fillAttr = `fill="url(#grad-${v.id})"`;
  }
  const shadow = nodeEffectsCss(v.effects, env, v, warnings, 'vector');
  const pos = insideFlex
    ? `position:relative;left:0;top:0;flex:${String(v.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;`;
  htmlParts.push(`<div class="hfc-node-${v.id}" data-hfc-id="${v.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`${hfcNodeCssSel(v.id)}{${pos}width:${String(w)}px;height:${String(h)}px;box-sizing:border-box;${opRot}${shadow}}`);
  let defs = '';
  if (fill?.type === 'GRADIENT_LINEAR') {
    const { x1, y1, x2, y2 } = svgLinearGradientEndpoints(fill, w, h);
    defs += `<linearGradient id="grad-${v.id}" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</linearGradient>`;
  } else if (fill?.type === 'GRADIENT_RADIAL') {
    const ra = svgRadialGradientAttrs(fill);
    const gt = ra.gradientTransform ? ` gradientTransform="${ra.gradientTransform}"` : '';
    defs += `<radialGradient id="grad-${v.id}" gradientUnits="objectBoundingBox" cx="${ra.cx}" cy="${ra.cy}" r="${ra.r}"${gt}>`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</radialGradient>`;
  }
  const sw = v.strokeWeight ?? 0;
  const sp = v.strokes?.[0];
  const strokePart =
    sp && sp.type === 'SOLID' && sw > 0
      ? ` ${svgStrokeAttrs({ strokes: v.strokes, strokeWeight: sw, strokeCap: v.strokeCap, strokeJoin: v.strokeJoin })}${dashArrayAttr(v)}`
      : '';
  const pathHtml = v.vectorPaths
    .map(
      (p) =>
        `<path d="${escapeAttr(p.data)}" fill-rule="${p.windingRule.toLowerCase()}" ${fillAttr}${strokePart}/>`
    )
    .join('');
  htmlParts.push(
    `<svg class="hfc-vector-svg" viewBox="${viewBox}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${defs ? `<defs>${defs}</defs>` : ''}${pathHtml}</svg></div>`
  );
}

/** Local offset for a GROUP child stored in frame space (see import normalizeGroupChildrenToFrameSpace). */
function groupChildLocalOffset(node: SceneNode, group: GroupNode): { x: number; y: number } {
  let relX = node.x - group.x;
  let relY = node.y - group.y;
  if (relY > group.height + 1 && node.y >= group.y + group.y) {
    relX = node.x - 2 * group.x;
    relY = node.y - 2 * group.y;
  }
  if (relY > group.height + 1) {
    for (const ch of group.children) {
      if (ch.type !== 'GROUP') continue;
      const nestedX = ch.x - group.x;
      const nestedY = ch.y - group.y;
      if (nestedY > 0) {
        relX = node.x - 2 * group.x - 2 * nestedX;
        relY = node.y - 2 * group.y - 2 * nestedY;
        break;
      }
    }
  }
  return { x: relX, y: relY };
}

/** Figma GROUP: positioned wrapper; children use coordinates relative to group origin. */
type SvgIconEmitNode = {
  id: string;
  width: number;
  height: number;
  iconSvgAssetHash?: string;
  layoutGrow?: number;
  constraints?: LayoutConstraints;
};

/** Render plugin-exported SVG icon instead of compiling mask/boolean subtrees. */
function tryEmitExportedSvgIcon(
  n: SvgIconEmitNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  imgMap: Record<string, string>,
  insideFlex: boolean,
  parentFrame?: FrameNode
): boolean {
  if (!n.iconSvgAssetHash) return false;
  const url = imgMap[n.iconSvgAssetHash];
  if (!url) return false;

  const pos = insideFlex
    ? `position:relative;left:0;top:0;flex:${String(n.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : n.constraints && parentFrame
      ? constraintPositionCss(n as FrameNode, parentFrame.width, parentFrame.height)
      : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;`;

  htmlParts.push(`<div class="hfc-node-${n.id} hfc-svg-icon" data-hfc-id="${n.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(
    `${hfcNodeCssSel(n.id)}{${pos}width:${String(n.width)}px;height:${String(n.height)}px;box-sizing:border-box;${opRot}}`
  );
  htmlParts.push(
    `<img src="${escapeAttr(url)}" alt="" width="${String(n.width)}" height="${String(n.height)}" style="display:block;width:100%;height:100%;" />`
  );
  htmlParts.push('</div>');
  return true;
}

function emitGroup(
  g: GroupNode,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  parentFrame?: FrameNode,
  parentGroup?: GroupNode
): void {
  const localPos = parentGroup ? groupChildLocalOffset(g, parentGroup) : { x: g.x, y: g.y };
  const zIndex = z.value++;
  const opRot = transformOpacityCss(g);
  if (
    tryEmitExportedSvgIcon(
      g,
      localPos.x,
      localPos.y,
      zIndex,
      opRot,
      htmlParts,
      cssParts,
      imgMap,
      insideFlex,
      parentFrame
    )
  ) {
    return;
  }
  const outerCss = insideFlex
    ? flexChildLayoutCss(g, true, { absX: localPos.x, absY: localPos.y, width: g.width, height: g.height }, parentFrame)
    : `position:absolute;left:${String(localPos.x)}px;top:${String(localPos.y)}px;width:${String(g.width)}px;height:${String(g.height)}px;`;
  const groupClass = insideFlex ? `hfc-node-${g.id} hfc-group-flex` : `hfc-node-${g.id} hfc-group`;
  htmlParts.push(`<div class="${groupClass}" data-hfc-id="${g.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`${hfcNodeCssSel(g.id)}{${outerCss}box-sizing:border-box;${opRot}}`);
  emitGroupChildren(
    g,
    originX,
    originY,
    shiftX,
    shiftY,
    htmlParts,
    cssParts,
    z,
    imgMap,
    patternTiles,
    warnings,
    insideFlex,
    env,
    parentFrame
  );
  htmlParts.push('</div>');
}

/** Emit group children with mask clusters (flattening skips mask relationships). */
function emitGroupChildren(
  g: GroupNode,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  parentFrame?: FrameNode
): void {
  const childList = [...g.children].sort((a, b) => internalIdSeq(a.id) - internalIdSeq(b.id));
  let i = 0;
  while (i < childList.length) {
    const ch = childList[i]!;
    if (ch.isMask) {
      const masked: SceneNode[] = [];
      i++;
      while (i < childList.length && !childList[i]!.isMask) {
        masked.push(childList[i]!);
        i++;
      }
      emitMaskCluster(
        ch,
        masked,
        g,
        0,
        0,
        originX,
        originY,
        shiftX,
        shiftY,
        htmlParts,
        cssParts,
        z,
        imgMap,
        patternTiles,
        warnings,
        env
      );
      continue;
    }
    if (ch.type === 'GROUP') {
      emitGroup(
        ch,
        originX,
        originY,
        shiftX,
        shiftY,
        htmlParts,
        cssParts,
        z,
        imgMap,
        patternTiles,
        warnings,
        insideFlex,
        env,
        parentFrame,
        g
      );
      i++;
      continue;
    }
    emitScene(
      ch,
      originX,
      originY,
      shiftX,
      shiftY,
      htmlParts,
      cssParts,
      z,
      imgMap,
      patternTiles,
      warnings,
      false,
      env,
      g.children,
      undefined,
      false,
      g
    );
    i++;
  }
}

/**
 * Frame / transform-group local box for mask clusters (children stack in `x`/`y` space).
 */
type MaskLayoutParent = Pick<TransformGroupNode, 'width' | 'height' | 'children' | 'x' | 'y'>;

function emitTransformGroup(
  tg: TransformGroupNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  insideFlex: boolean,
  env: FileEnvelope
): void {
  const pos = insideFlex
    ? `position:relative;left:0;top:0;flex:${String(tg.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;`;
  htmlParts.push(`<div class="hfc-node-${tg.id}" data-hfc-id="${tg.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(
    `${hfcNodeCssSel(tg.id)}{${pos}width:${String(tg.width)}px;height:${String(tg.height)}px;box-sizing:border-box;${opRot}}`
  );
  emitChildrenWithMasks(tg, undefined, absX, absY, originX, originY, shiftX, shiftY, htmlParts, cssParts, z, imgMap, patternTiles, warnings, false, env);
  htmlParts.push('</div>');
}

function emitMaskCluster(
  maskNode: SceneNode,
  masked: SceneNode[],
  parent: MaskLayoutParent,
  containerAbsX: number,
  containerAbsY: number,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  env: FileEnvelope
): void {
  const mid = `hfc-svg-mask-${maskNode.id}`;
  const zi = z.value++;
  const maskDef = maskShapeSvgMarkup(maskNode, parent.width, parent.height, mid);
  htmlParts.push(
    `<div class="hfc-mask-wrap" data-hfc-mask="${maskNode.id}" style="position:absolute;left:${String(containerAbsX)}px;top:${String(
      containerAbsY
    )}px;width:${String(parent.width)}px;height:${String(parent.height)}px;overflow:visible;z-index:${String(zi)}">`
  );
  htmlParts.push(
    `<svg width="0" height="0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>${maskDef}</defs></svg>`
  );
  htmlParts.push(
    `<div class="hfc-masked-inner" style="position:absolute;left:0;top:0;width:${String(parent.width)}px;height:${String(
      parent.height
    )}px;mask:url(#${mid});-webkit-mask:url(#${mid});">`
  );
  for (const c of masked) {
    emitScene(
      c,
      originX + parent.x,
      originY + parent.y,
      shiftX,
      shiftY,
      htmlParts,
      cssParts,
      z,
      imgMap,
      patternTiles,
      warnings,
      false,
      env,
      parent.children,
      undefined,
      true
    );
  }
  htmlParts.push('</div></div>');
}

function emitChildrenWithMasks(
  ctn: MaskLayoutParent,
  parentFrame: FrameNode | undefined,
  containerAbsX: number,
  containerAbsY: number,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  flexInner: boolean,
  env: FileEnvelope
): void {
  const childList =
    parentFrame?.itemReverseZIndex && flexInner ? [...ctn.children].reverse() : ctn.children;
  let i = 0;
  while (i < childList.length) {
    const ch = childList[i]!;
    if (ch.isMask && !flexInner) {
      const masked: SceneNode[] = [];
      i++;
      while (i < childList.length && !childList[i]!.isMask) {
        masked.push(childList[i]!);
        i++;
      }
      emitMaskCluster(
        ch,
        masked,
        ctn,
        containerAbsX,
        containerAbsY,
        originX,
        originY,
        shiftX,
        shiftY,
        htmlParts,
        cssParts,
        z,
        imgMap,
        patternTiles,
        warnings,
        env
      );
      continue;
    }
    emitScene(
      ch,
      originX + ctn.x,
      originY + ctn.y,
      shiftX,
      shiftY,
      htmlParts,
      cssParts,
      z,
      imgMap,
      patternTiles,
      warnings,
      flexInner,
      env,
      ctn.children,
      parentFrame,
      !flexInner
    );
    i++;
  }
}

function emitFrameChildren(
  f: FrameNode,
  frameAbsX: number,
  frameAbsY: number,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  flexInner: boolean,
  env: FileEnvelope
): void {
  emitChildrenWithMasks(f, f, frameAbsX, frameAbsY, originX, originY, shiftX, shiftY, htmlParts, cssParts, z, imgMap, patternTiles, warnings, flexInner, env);
}

function emitScene(
  n: SceneNode,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  parentChildren: SceneNode[] | null,
  parentFrame?: FrameNode,
  useParentCoords = false,
  coordGroupParent?: GroupNode
): void {
  if (n.type === 'SECTION') return;

  if (n.type === 'GROUP') {
    emitGroup(
      n,
      originX,
      originY,
      shiftX,
      shiftY,
      htmlParts,
      cssParts,
      z,
      imgMap,
      patternTiles,
      warnings,
      insideFlex,
      env,
      parentFrame
    );
    return;
  }

  if (n.type === 'SLICE') {
    return;
  }

  const pageX = originX + n.x + shiftX;
  const pageY = originY + n.y + shiftY;
  const groupLocal = coordGroupParent ? groupChildLocalOffset(n, coordGroupParent) : undefined;
  const absX = groupLocal ? groupLocal.x : useParentCoords ? n.x : pageX;
  const absY = groupLocal ? groupLocal.y : useParentCoords ? n.y : pageY;
  const zIndex = z.value++;
  const opRot = transformOpacityCss(n);

  if (n.type === 'TEXT') {
    const t = n;
    if (t.textOnPath && parentChildren) {
      const pathNode = parentChildren.find((p) => p.id === t.textOnPath!.pathId);
      const vp = pathNode?.type === 'VECTOR' ? pathNode.vectorPaths?.[0] : undefined;
      if (vp?.data) {
        const shadow = nodeEffectsCss(effectiveTextEffects(t, env), env, t, warnings, 'text');
        const vpBox = svgViewportForPathData(vp.data);
        const w = Math.max(t.width, vpBox.width);
        const h = Math.max(t.height, vpBox.height);
        const startOff = t.textOnPath.startOffset ?? 0;
        const pos = insideFlex
          ? `position:relative;left:0;top:0;width:${String(w)}px;height:${String(h)}px;flex:${String(t.layoutGrow ?? 0)} 1 auto;min-width:0;overflow:visible;`
          : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;overflow:visible;`;
        const base = effectiveTextBase(t, env);
        const pid = `hfc-tp-${t.id}`;
        const fsAttr = fontSizeForSvgText(env, t, base.fontSize);
        const fw = base.fontWeight;
        const ff = escapeAttr(t.fontName?.family ?? 'Inter');
        const col = paintColorCss(base.fills?.[0], env, '#000', warnings, `textpath:${t.id}`);
        const tpText = effectiveTextCharacters(t, env);
        htmlParts.push(`<div class="hfc-node-${t.id}" data-hfc-id="${t.id}" style="z-index:${String(zIndex)}">`);
        cssParts.push(`${hfcNodeCssSel(t.id)}{${pos}box-sizing:border-box;${opRot}${shadow}}`);
        htmlParts.push(
          `<svg class="hfc-textpath-svg" viewBox="${vpBox.viewBox}" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg"><defs><path id="${pid}" d="${escapeAttr(vp.data)}"/></defs><text font-family="${ff}" font-size="${fsAttr}" font-weight="${String(fw)}" fill="${escapeAttr(col)}"><textPath href="#${pid}" startOffset="${String(startOff)}">${escapeHtmlText(tpText)}</textPath></text></svg></div>`
        );
        return;
      }
      warnings.push(`text_on_path_invalid:${t.id}`);
    }
    const shadow = nodeEffectsCss(effectiveTextEffects(t, env), env, t, warnings, 'text');
    const pos = insideFlex
      ? sceneChildPos(t, insideFlex, absX, absY, parentFrame)
      : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(t.width)}px;height:${String(t.height)}px;`;
    const singleLine = textIsSingleLineBox(t, env);
    const flexOuterAlign = textFlexContainerCss(t, singleLine);
    const baseTypo = effectiveTextBase(t, env);
    const lhPx = hugTextLineHeightPxFromTypography(effectiveTextMaxFontSizePx(t, env), t.lineHeight);
    const textColor = paintColorCss(baseTypo.fills?.[0], env, 'rgba(0,0,0,1)', warnings, `text:${t.id}`);
    const flexTextMetrics = singleLine
      ? `line-height:${String(lhPx)}px;${leadingTrimCss(t.leadingTrim)}`
      : paragraphTypographyCss(mergeTypographyFromText(t), baseTypo.fontSize, env);
    const innerRule = `${textInnerHorizontalCss(t)}${
      singleLine ? 'min-width:0;width:100%;display:block;box-sizing:border-box;' : ''
    }`;
    const textStroke = t.strokes?.[0];
    const tsw = t.strokeWeight ?? 0;
    const textStrokeCss =
      textStroke && textStroke.type === 'SOLID' && tsw > 0
        ? `-webkit-text-stroke:${String(tsw)}px ${strokeRgbaFromSolid(textStroke)};`
        : '';
    htmlParts.push(`<div class="hfc-node-${t.id}" data-hfc-id="${t.id}" style="z-index:${String(zIndex)}">`);
    cssParts.push(
      `${hfcNodeCssSel(t.id)}{${pos}box-sizing:border-box;color:${textColor};${flexOuterAlign}${textFlowCss(t, env)}${flexTextMetrics}${fontFamilyCssFromName(t.fontName, t.boundVariables?.fontFamily, env)}${textStrokeCss}${opRot}${shadow}}`
    );
    cssParts.push(`${hfcNodeCssSel(t.id)} .hfc-text-inner{${innerRule}}`);
    htmlParts.push(`<div class="hfc-text-inner">${emitTextInnerHtml(t, env, warnings, singleLine)}</div></div>`);
    return;
  }

  if (n.type === 'FRAME') {
    const f = n;
    if (
      tryEmitExportedSvgIcon(
        f,
        absX,
        absY,
        zIndex,
        opRot,
        htmlParts,
        cssParts,
        imgMap,
        insideFlex,
        parentFrame
      )
    ) {
      return;
    }
    const frameFills = effectiveFrameFills(f, env);
    const fill = frameFills[0];
    const fillCss = fillBackgroundStyles(fill, imgMap, patternTiles, warnings, `frame_fill:${f.id}`, env);
    const frameStrokes = effectiveFrameStrokes(f, env);
    const strokeResult = computeStrokeBorder(
      { ...f, strokes: frameStrokes },
      f.id,
      escapeAttr
    );
    warnings.push(...strokeResult.warnings);
    const border = strokeResult.borderCss;
    const shadow = nodeEffectsCss(effectiveFrameEffects(f, env), env, f, warnings, 'frame');
    const radiusCss = frameCornerRadiusCss(f);
    const radiusClip = radiusCss ? 'overflow:hidden;' : '';
    const clip = (frameEffectiveClipsContent(f) ? 'overflow:hidden;' : '') || radiusClip;
    const layered = frameNeedsLayeredBackground(f);
    const flex = frameUsesFlexCss(f);
    const frameAbsX = pageX;
    const frameAbsY = pageY;
    const frameOuterCss = insideFlex
      ? sceneChildPos(f, insideFlex, absX, absY, parentFrame)
      : f.constraints && parentFrame
        ? constraintPositionCss(f, parentFrame.width, parentFrame.height)
        : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(f.width)}px;height:${String(f.height)}px;`;

    if (!layered) {
      htmlParts.push(`<div class="hfc-node-${f.id}" data-hfc-id="${f.id}" style="z-index:${String(zIndex)}">`);
      cssParts.push(
        `${hfcNodeCssSel(f.id)}{${frameOuterCss}box-sizing:border-box;${fillCss}border:${border};${radiusCss}${clip}${opRot}${shadow}}`
      );
      if (strokeResult.svgOverlay) htmlParts.push(strokeResult.svgOverlay);
      if (flex) {
        htmlParts.push(
          `<div class="hfc-frame-flex-inner hfc-frame-flex-${f.id}" style="position:absolute;left:0;top:0;right:0;bottom:0;${frameFlexInnerStyle(f, env)}">`
        );
        emitFrameChildren(f, frameAbsX, frameAbsY, originX, originY, shiftX, shiftY, htmlParts, cssParts, z, imgMap, patternTiles, warnings, true, env);
        htmlParts.push('</div>');
      } else {
        emitFrameChildren(f, frameAbsX, frameAbsY, originX, originY, shiftX, shiftY, htmlParts, cssParts, z, imgMap, patternTiles, warnings, false, env);
      }
      htmlParts.push('</div>');
      return;
    }

    const bgPaint = f.backgrounds?.[0];
    const bgCss =
      bgPaint && bgPaint.type === 'SOLID' && (bgPaint.visible === undefined || bgPaint.visible)
        ? `background-color:${rgbaFromSolid(bgPaint)};`
        : fillBackgroundStyles(bgPaint, imgMap, patternTiles, warnings, `frame_bg:${f.id}`, env);

    htmlParts.push(`<div class="hfc-node-${f.id}" data-hfc-id="${f.id}" style="z-index:${String(zIndex)}">`);
    cssParts.push(
      `${hfcNodeCssSel(f.id)}{${frameOuterCss}box-sizing:border-box;border:${border};background-color:transparent;${radiusCss}${clip}${opRot}${shadow}}`
    );
    cssParts.push(
      `${hfcNodeCssSel(f.id)} > .hfc-bg-layer{${bgCss}}${hfcNodeCssSel(f.id)} > .hfc-fill-layer{${fillCss}}`
    );
    htmlParts.push(
      `<div class="hfc-bg-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:0"></div>`
    );
    htmlParts.push(
      `<div class="hfc-fill-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:1"></div>`
    );
    if (flex) {
      htmlParts.push(
        `<div class="hfc-frame-flex-inner hfc-frame-flex-${f.id}" style="position:absolute;left:0;top:0;right:0;bottom:0;z-index:2;${frameFlexInnerStyle(f, env)}">`
      );
      emitFrameChildren(f, frameAbsX, frameAbsY, originX, originY, shiftX, shiftY, htmlParts, cssParts, z, imgMap, patternTiles, warnings, true, env);
      htmlParts.push('</div>');
    } else {
      emitFrameChildren(f, frameAbsX, frameAbsY, originX, originY, shiftX, shiftY, htmlParts, cssParts, z, imgMap, patternTiles, warnings, false, env);
    }
    htmlParts.push('</div>');
    return;
  }

  if (n.type === 'TRANSFORM_GROUP') {
    emitTransformGroup(n, absX, absY, zIndex, opRot, htmlParts, cssParts, z, imgMap, patternTiles, warnings, originX, originY, shiftX, shiftY, insideFlex, env);
    return;
  }

  if (n.type === 'BOOLEAN_OPERATION') {
    emitBooleanOperation(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings, insideFlex, env);
    return;
  }

  if (n.type === 'VECTOR') {
    const isTextPathGuide =
      parentChildren?.some((p) => p.type === 'TEXT' && p.textOnPath?.pathId === n.id) ?? false;
    if (!isTextPathGuide) {
      emitVector(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings, insideFlex, env);
    }
    return;
  }

  if (n.type === 'RECTANGLE') {
    emitRectangle(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, patternTiles, warnings, insideFlex, env, parentFrame);
    return;
  }
  if (n.type === 'ELLIPSE') {
    emitEllipse(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, patternTiles, warnings, insideFlex, env, parentFrame);
    return;
  }
  if (n.type === 'LINE') {
    emitLine(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings, insideFlex, env);
    return;
  }
  if (n.type === 'POLYGON') {
    emitPolygon(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings, insideFlex, env);
    return;
  }
  if (n.type === 'STAR') {
    emitStar(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings, insideFlex, env);
    return;
  }
  if (n.type === 'TABLE') {
    emitTable(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, patternTiles, warnings, insideFlex, env);
    return;
  }
  if (n.type === 'COMPONENT') {
    emitPlacedComponent(n, absX, absY, zIndex, opRot, htmlParts, cssParts, z, imgMap, patternTiles, warnings, insideFlex, env, originX, originY, shiftX, shiftY);
    return;
  }
  if (n.type === 'COMPONENT_INSTANCE') {
    emitComponentInstance(n, absX, absY, zIndex, opRot, htmlParts, cssParts, z, imgMap, patternTiles, warnings, insideFlex, env, originX, originY, shiftX, shiftY);
    return;
  }
  if (n.type === 'INSTANCE') {
    emitInstance(n, absX, absY, zIndex, opRot, htmlParts, cssParts, z, imgMap, patternTiles, warnings, insideFlex, env, originX, originY, shiftX, shiftY);
    return;
  }
}

function emitTable(
  tb: TableNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope
): void {
  const pos = insideFlex
    ? `position:relative;left:0;top:0;width:${String(tb.width)}px;height:${String(tb.height)}px;flex:${String(tb.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(tb.width)}px;height:${String(tb.height)}px;`;
  htmlParts.push(`<div class="hfc-node-${tb.id}" data-hfc-id="${tb.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`${hfcNodeCssSel(tb.id)}{${pos}box-sizing:border-box;${opRot}}`);
  const rows: string[] = [];
  let idx = 0;
  for (let r = 0; r < tb.rowCount; r++) {
    const tds: string[] = [];
    for (let c = 0; c < tb.columnCount; c++) {
      const cell = tb.cells[idx]!;
      idx += 1;
      const w = tb.columnWidths[c]!;
      const h = tb.rowHeights[r]!;
      const bg = fillBackgroundStyles(cell.fills?.[0], imgMap, patternTiles, warnings, `table_cell:${tb.id}:${String(r)}:${String(c)}`, env);
      tds.push(
        `<td class="hfc-table-cell" style="width:${String(w)}px;height:${String(h)}px;border:1px solid rgba(0,0,0,0.12);vertical-align:middle;padding:4px;box-sizing:border-box;${bg}">${escapeHtmlText(cell.text)}</td>`
      );
    }
    rows.push(`<tr>${tds.join('')}</tr>`);
  }
  htmlParts.push(
    `<table class="hfc-table" style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;">${rows.join('')}</table></div>`
  );
}

function cloneComponentRoot(root: FrameNode): FrameNode {
  return structuredClone(root) as FrameNode;
}

/** Component masters are often hidden on the canvas; instances must still render their contents. */
function cloneComponentRootForInstance(root: FrameNode): FrameNode {
  const cloned = cloneComponentRoot(root);
  cloned.visible = true;
  return cloned;
}

function scaleCornerRadii(
  n: {
    cornerRadius?: number;
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomRightRadius?: number;
    bottomLeftRadius?: number;
  },
  scale: number
): void {
  if (n.cornerRadius !== undefined) n.cornerRadius *= scale;
  if (n.topLeftRadius !== undefined) n.topLeftRadius *= scale;
  if (n.topRightRadius !== undefined) n.topRightRadius *= scale;
  if (n.bottomRightRadius !== undefined) n.bottomRightRadius *= scale;
  if (n.bottomLeftRadius !== undefined) n.bottomLeftRadius *= scale;
}

/** Scale cloned master geometry to match instance bounds (Figma stretches scaled instances). */
function scaleSceneNodeGeometry(n: SceneNode, sx: number, sy: number): void {
  n.x *= sx;
  n.y *= sy;
  const avg = (sx + sy) / 2;

  if (
    n.type === 'FRAME' ||
    n.type === 'RECTANGLE' ||
    n.type === 'ELLIPSE' ||
    n.type === 'LINE' ||
    n.type === 'POLYGON' ||
    n.type === 'STAR' ||
    n.type === 'VECTOR' ||
    n.type === 'BOOLEAN_OPERATION' ||
    n.type === 'TRANSFORM_GROUP' ||
    n.type === 'GROUP' ||
    n.type === 'SECTION' ||
    n.type === 'SLICE' ||
    n.type === 'TABLE'
  ) {
    n.width *= sx;
    n.height *= sy;
  }

  if (n.type === 'TEXT') {
    n.width *= sx;
    n.height *= sy;
    if (n.fontSize !== undefined) n.fontSize *= avg;
    if (n.letterSpacing?.unit === 'PIXELS' && n.letterSpacing.value !== undefined) {
      n.letterSpacing = { ...n.letterSpacing, value: n.letterSpacing.value * sx };
    }
    if (n.lineHeight?.unit === 'PIXELS' && n.lineHeight.value !== undefined) {
      n.lineHeight = { ...n.lineHeight, value: n.lineHeight.value * sy };
    }
  }

  if (n.type === 'RECTANGLE' || n.type === 'FRAME') {
    scaleCornerRadii(n, avg);
  }

  if (
    (n.type === 'RECTANGLE' ||
      n.type === 'FRAME' ||
      n.type === 'ELLIPSE' ||
      n.type === 'LINE' ||
      n.type === 'POLYGON' ||
      n.type === 'STAR' ||
      n.type === 'VECTOR' ||
      n.type === 'TEXT') &&
    n.strokeWeight !== undefined
  ) {
    n.strokeWeight *= avg;
  }

  if (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP' || n.type === 'SECTION') {
    for (const ch of n.children) scaleSceneNodeGeometry(ch, sx, sy);
  } else if (n.type === 'BOOLEAN_OPERATION') {
    for (const ch of n.children) scaleSceneNodeGeometry(ch as SceneNode, sx, sy);
  }
}

function scaleComponentRootToInstance(root: FrameNode, targetWidth: number, targetHeight: number): void {
  if (root.width <= 0 || root.height <= 0 || targetWidth <= 0 || targetHeight <= 0) return;
  const sx = targetWidth / root.width;
  const sy = targetHeight / root.height;
  if (Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6) return;
  scaleSceneNodeGeometry(root, sx, sy);
}

type CornerRadiiFields = Pick<
  RectangleNode,
  'cornerRadius' | 'topLeftRadius' | 'topRightRadius' | 'bottomRightRadius' | 'bottomLeftRadius' | 'cornerSmoothing'
>;

function copyCornerRadiiFromDetached(master: CornerRadiiFields, detached: CornerRadiiFields): void {
  if (detached.cornerRadius !== undefined) master.cornerRadius = detached.cornerRadius;
  if (detached.topLeftRadius !== undefined) master.topLeftRadius = detached.topLeftRadius;
  if (detached.topRightRadius !== undefined) master.topRightRadius = detached.topRightRadius;
  if (detached.bottomRightRadius !== undefined) master.bottomRightRadius = detached.bottomRightRadius;
  if (detached.bottomLeftRadius !== undefined) master.bottomLeftRadius = detached.bottomLeftRadius;
  if (detached.cornerSmoothing !== undefined) master.cornerSmoothing = detached.cornerSmoothing;
}

function copySceneBoundsFromDetached(master: SceneNode, detached: SceneNode): void {
  master.x = detached.x;
  master.y = detached.y;
  if (
    master.type === 'FRAME' ||
    master.type === 'RECTANGLE' ||
    master.type === 'ELLIPSE' ||
    master.type === 'LINE' ||
    master.type === 'POLYGON' ||
    master.type === 'STAR' ||
    master.type === 'VECTOR' ||
    master.type === 'TEXT'
  ) {
    master.width = detached.width;
    master.height = detached.height;
  }
  if (detached.constraints) master.constraints = { ...detached.constraints };
}

function mergeRectangleFromDetached(master: RectangleNode, detached: RectangleNode): void {
  copySceneBoundsFromDetached(master, detached);
  copyCornerRadiiFromDetached(master, detached);
  if (detached.fills !== undefined) master.fills = structuredClone(detached.fills);
  if (detached.strokes !== undefined) master.strokes = structuredClone(detached.strokes);
  if (detached.effects !== undefined) master.effects = structuredClone(detached.effects);
  if (detached.strokeWeight !== undefined) master.strokeWeight = detached.strokeWeight;
  if (detached.strokeAlign !== undefined) master.strokeAlign = detached.strokeAlign;
  if (detached.visible !== undefined) master.visible = detached.visible;
  if (detached.opacity !== undefined) master.opacity = detached.opacity;
}

function mergeTextFromDetached(master: TextNode, detached: TextNode): void {
  copySceneBoundsFromDetached(master, detached);
  if (detached.characters !== undefined) master.characters = detached.characters;
  if (detached.fontSize !== undefined) master.fontSize = detached.fontSize;
  if (detached.fontWeight !== undefined) master.fontWeight = detached.fontWeight;
  if (detached.fills !== undefined) master.fills = structuredClone(detached.fills);
  if (detached.visible !== undefined) master.visible = detached.visible;
  if (detached.opacity !== undefined) master.opacity = detached.opacity;
}

function mergeFrameFromDetached(master: FrameNode, detached: FrameNode): void {
  copySceneBoundsFromDetached(master, detached);
  copyCornerRadiiFromDetached(master, detached);
  if (detached.fills !== undefined) master.fills = structuredClone(detached.fills);
  if (detached.clipsContent !== undefined) master.clipsContent = detached.clipsContent;
  mergeDetachedChildrenIntoRoot(master, detached.children);
}

/** Align exported instance subtrees onto cloned masters (same structure, instance-local ids and geometry). */
function mergeNodePairFromDetached(master: SceneNode, detached: SceneNode): void {
  if (master.type === 'RECTANGLE' && detached.type === 'RECTANGLE') {
    mergeRectangleFromDetached(master, detached);
    return;
  }
  if (master.type === 'TEXT' && detached.type === 'TEXT') {
    mergeTextFromDetached(master, detached);
    return;
  }
  if (master.type === 'FRAME' && detached.type === 'FRAME') {
    mergeFrameFromDetached(master, detached);
    return;
  }
  if (master.type === 'FRAME' && master.children.length === 1) {
    mergeNodePairFromDetached(master.children[0]!, detached);
    return;
  }
  if (detached.type === 'FRAME' && detached.children.length === 1 && master.type !== 'FRAME') {
    mergeNodePairFromDetached(master, detached.children[0]!);
  }
}

function mergeDetachedChildrenIntoRoot(root: FrameNode, detached: SceneNode[]): void {
  if (!detached.length) return;
  const masterKids = root.children;
  if (
    masterKids.length === 1 &&
    masterKids[0]!.type === 'FRAME' &&
    detached.length === 1 &&
    detached[0]!.type !== 'FRAME'
  ) {
    mergeNodePairFromDetached(masterKids[0]!, detached[0]!);
    return;
  }
  if (detached.length === 1 && detached[0]!.type === 'FRAME' && masterKids.length > 0) {
    mergeDetachedChildrenIntoRoot(root, (detached[0] as FrameNode).children);
    return;
  }
  const n = Math.min(masterKids.length, detached.length);
  for (let i = 0; i < n; i++) {
    mergeNodePairFromDetached(masterKids[i]!, detached[i]!);
  }
}

function prepareInstanceComponentRoot(
  root: FrameNode,
  inst: Pick<InstanceNode, 'width' | 'height' | 'children'>,
  env: FileEnvelope,
  overrides?: ComponentInstanceNode['overrides']
): void {
  applyComponentOverrides(root, overrides);
  const detached = instanceDetachedChildren(inst as InstanceNode);
  if (detached) {
    mergeDetachedChildrenIntoRoot(root, detached);
  } else {
    scaleComponentRootToInstance(root, inst.width, inst.height);
  }
  prepareClonedComponentSubtreeForEmit(root, env);
}

/** Instance/component clones are not in compile roots; run the same intrinsic pass as {@link compileRootScenes}. */
function prepareClonedComponentSubtreeForEmit(root: SceneNode, env: FileEnvelope): void {
  applyAutoLayoutIntrinsicSizingDeep(root, env);
  syncHugTextLayoutMetricsDeep(root, env);
}

function applyComponentOverrides(root: FrameNode, overrides: ComponentInstanceNode['overrides']): void {
  if (!overrides) return;
  const stack: SceneNode[] = [...root.children];
  while (stack.length) {
    const node = stack.pop()!;
    const o = overrides[node.id];
    if (o) {
      if (node.type === 'TEXT') {
        if (o.characters !== undefined) node.characters = o.characters;
        if (o.fontSize !== undefined) node.fontSize = o.fontSize;
        if (o.fontWeight !== undefined) node.fontWeight = o.fontWeight;
        if (o.fills !== undefined) node.fills = o.fills;
      } else if ('fills' in node && o.fills !== undefined) {
        (node as { fills?: Paint[] }).fills = o.fills;
      }
    }
    if (node.type === 'FRAME' || node.type === 'TRANSFORM_GROUP') {
      for (const ch of node.children) stack.push(ch);
    } else if (node.type === 'BOOLEAN_OPERATION') {
      for (const ch of node.children as unknown as SceneNode[]) stack.push(ch);
    }
  }
}

/** COMPONENT nodes placed on the canvas (common in plugin exports) render like instances. */
function emitPlacedComponent(
  comp: ComponentNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number
): void {
  if (
    tryEmitExportedSvgIcon(
      comp,
      absX,
      absY,
      zIndex,
      opRot,
      htmlParts,
      cssParts,
      imgMap,
      insideFlex
    )
  ) {
    return;
  }
  const inst: InstanceNode = {
    id: comp.id,
    type: 'INSTANCE',
    name: comp.name,
    x: comp.x,
    y: comp.y,
    width: comp.width,
    height: comp.height,
    mainComponentId: comp.id,
    rotation: comp.rotation,
    opacity: comp.opacity,
    blendMode: comp.blendMode,
    layoutGrow: comp.layoutGrow,
    layoutAlign: comp.layoutAlign,
    layoutPositioning: comp.layoutPositioning,
    layoutSizingHorizontal: comp.layoutSizingHorizontal,
    layoutSizingVertical: comp.layoutSizingVertical,
  };
  emitInstance(inst, absX, absY, zIndex, opRot, htmlParts, cssParts, z, imgMap, patternTiles, warnings, insideFlex, env, originX, originY, shiftX, shiftY);
}

function emitComponentInstance(
  inst: ComponentInstanceNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number
): void {
  if (
    tryEmitExportedSvgIcon(
      inst,
      absX,
      absY,
      zIndex,
      opRot,
      htmlParts,
      cssParts,
      imgMap,
      insideFlex
    )
  ) {
    return;
  }
  const main = env.components?.find((c) => c.id === inst.mainComponentId);
  if (!main) {
    warnings.push(`missing_component:${inst.mainComponentId}`);
    return;
  }
  const root = cloneComponentRootForInstance(main.root);
  if (root.x !== 0 || root.y !== 0) {
    warnings.push(`component_root_nonzero:${inst.mainComponentId}`);
  }
  prepareInstanceComponentRoot(root, inst, env, inst.overrides);
  const pos = insideFlex
    ? `position:relative;left:0;top:0;width:${String(inst.width)}px;height:${String(inst.height)}px;flex:${String(inst.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(inst.width)}px;height:${String(inst.height)}px;`;
  htmlParts.push(`<div class="hfc-node-${inst.id} hfc-component-instance" data-hfc-id="${inst.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`.hfc-node-${inst.id}{${pos}box-sizing:border-box;overflow:hidden;${opRot}}`);
  withInstanceCssScope(inst.id, () => {
    emitScene(
      root,
      originX + inst.x,
      originY + inst.y,
      shiftX,
      shiftY,
      htmlParts,
      cssParts,
      z,
      imgMap,
      patternTiles,
      warnings,
      false,
      env,
      root.children,
      undefined,
      true
    );
  });
  htmlParts.push('</div>');
}

function findNodeInDocument(
  document: DocumentNode,
  id: string,
  env?: FileEnvelope
): SceneNode | PageNode | null {
  for (const p of document.children) {
    if (p.id === id) return p;
    for (const n of p.children) {
      const hit = findInSceneList(n, id);
      if (hit) return hit;
    }
  }
  if (env?.components) {
    for (const c of env.components) {
      if (c.id === id) {
        return {
          id: c.id,
          type: 'COMPONENT',
          name: c.name,
          x: 0,
          y: 0,
          width: c.root.width,
          height: c.root.height,
          rootFrameId: c.root.id,
        } as ComponentNode;
      }
      if (c.root.id === id) return c.root;
    }
  }
  return null;

  function findInSceneList(node: SceneNode, needle: string): SceneNode | null {
    if (node.id === needle) return node;
    if (
      node.type === 'FRAME' ||
      node.type === 'TRANSFORM_GROUP' ||
      node.type === 'GROUP' ||
      node.type === 'SECTION'
    ) {
      for (const ch of node.children) {
        const inner = findInSceneList(ch, needle);
        if (inner) return inner;
      }
    } else if (node.type === 'BOOLEAN_OPERATION') {
      for (const ch of node.children as unknown as SceneNode[]) {
        const inner = findInSceneList(ch, needle);
        if (inner) return inner;
      }
    }
    return null;
  }
}

function remapOverridesForVariant(
  overrides: InstanceNode['overrides'],
  nodeIdMap?: Record<string, string>
): InstanceNode['overrides'] {
  if (!overrides) return overrides;
  if (!nodeIdMap) return overrides;
  const out: NonNullable<InstanceNode['overrides']> = {};
  for (const [stableId, ov] of Object.entries(overrides)) {
    const variantId = nodeIdMap[stableId];
    if (variantId) out[variantId] = ov;
  }
  return out;
}

/** Figma plugin exports often include a detached subtree while `mainComponent` fails to remap. */
function instanceDetachedChildren(inst: InstanceNode): SceneNode[] | undefined {
  const ch = inst.children;
  return ch?.length ? ch : undefined;
}

function emitInstanceDetachedSubtree(
  inst: InstanceNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number
): boolean {
  const children = instanceDetachedChildren(inst);
  if (!children) return false;

  const root: FrameNode = {
    id: `${inst.id}__detached`,
    type: 'FRAME',
    name: inst.name,
    x: 0,
    y: 0,
    width: inst.width,
    height: inst.height,
    children,
    visible: true,
    rotation: 0,
    opacity: 1,
    blendMode: 'PASS_THROUGH',
    layoutPositioning: 'AUTO',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    layoutAlign: 'INHERIT',
    layoutGrow: 0,
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
  applyComponentOverrides(root, inst.overrides as ComponentInstanceNode['overrides']);
  prepareClonedComponentSubtreeForEmit(root, env);

  const pos = insideFlex
    ? `position:relative;left:0;top:0;width:${String(inst.width)}px;height:${String(inst.height)}px;flex:${String(
        inst.layoutGrow ?? 0
      )} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(inst.width)}px;height:${String(
        inst.height
      )}px;`;
  htmlParts.push(
    `<div class="hfc-node-${inst.id} hfc-component-instance hfc-instance-detached" data-hfc-id="${inst.id}" style="z-index:${String(zIndex)}">`
  );
  cssParts.push(`.hfc-node-${inst.id}{${pos}box-sizing:border-box;overflow:hidden;${opRot}}`);
  withInstanceCssScope(inst.id, () => {
    emitScene(
      root,
      originX + inst.x,
      originY + inst.y,
      shiftX,
      shiftY,
      htmlParts,
      cssParts,
      z,
      imgMap,
      patternTiles,
      warnings,
      false,
      env,
      root.children,
      undefined,
      true
    );
  });
  htmlParts.push('</div>');
  return true;
}

function emitInstance(
  inst: InstanceNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number },
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number
): void {
  if (
    tryEmitExportedSvgIcon(
      inst,
      absX,
      absY,
      zIndex,
      opRot,
      htmlParts,
      cssParts,
      imgMap,
      insideFlex
    )
  ) {
    return;
  }
  // Resolve component graph masters.
  const target = findNodeInDocument(env.document, inst.mainComponentId, env);

  // Back-compat for legacy `env.components[]`.
  if (!target && env.components) {
    const main = env.components?.find((c) => c.id === inst.mainComponentId);
    if (main) {
      const root = cloneComponentRootForInstance(main.root);
      prepareInstanceComponentRoot(root, inst, env, inst.overrides as ComponentInstanceNode['overrides']);
      const pos = insideFlex
        ? `position:relative;left:0;top:0;width:${String(inst.width)}px;height:${String(inst.height)}px;flex:${String(
            inst.layoutGrow ?? 0
          )} 1 auto;min-width:0;`
        : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(
            inst.width
          )}px;height:${String(inst.height)}px;`;
      htmlParts.push(
        `<div class="hfc-node-${inst.id} hfc-component-instance" data-hfc-id="${inst.id}" style="z-index:${String(zIndex)}">`
      );
      cssParts.push(`.hfc-node-${inst.id}{${pos}box-sizing:border-box;overflow:hidden;${opRot}}`);
      withInstanceCssScope(inst.id, () => {
        emitScene(
          root,
          originX + inst.x,
          originY + inst.y,
          shiftX,
          shiftY,
          htmlParts,
          cssParts,
          z,
          imgMap,
          patternTiles,
          warnings,
          false,
          env,
          root.children,
          undefined,
          true
        );
      });
      htmlParts.push('</div>');
      return;
    }
  }

  if (!target || (target.type !== 'COMPONENT' && target.type !== 'COMPONENT_SET')) {
    if (
      emitInstanceDetachedSubtree(
        inst,
        absX,
        absY,
        zIndex,
        opRot,
        htmlParts,
        cssParts,
        z,
        imgMap,
        patternTiles,
        warnings,
        insideFlex,
        env,
        originX,
        originY,
        shiftX,
        shiftY
      )
    ) {
      return;
    }
    warnings.push(`missing_component:${inst.mainComponentId}`);
    return;
  }

  let root: FrameNode;
  let appliedOverrides: InstanceNode['overrides'] = inst.overrides;

  if (target.type === 'COMPONENT') {
    const component = target as ComponentNode;
    const rootNode = findNodeInDocument(env.document, component.rootFrameId, env);
    if (!rootNode || rootNode.type !== 'FRAME') {
      warnings.push(`missing_component_root:${component.rootFrameId}`);
      return;
    }
    root = cloneComponentRootForInstance(rootNode as FrameNode);
  } else {
    const set = target as ComponentSetNode;
    const key = set.variantPropertyKey ?? 'variant';
    const selectedValue = inst.componentProperties?.[key]?.value ?? set.variantOptions?.[0];
    const options = set.variantOptions ?? set.componentIds;
    const idx = options.indexOf(String(selectedValue));
    const selectedComponentId = set.componentIds[idx] ?? set.componentIds[0];

    const selectedComponent = findNodeInDocument(env.document, selectedComponentId, env);
    if (!selectedComponent || selectedComponent.type !== 'COMPONENT') {
      warnings.push(`missing_component_variant:${selectedComponentId}`);
      return;
    }
    const comp = selectedComponent as ComponentNode;
    const rootNode = findNodeInDocument(env.document, comp.rootFrameId, env);
    if (!rootNode || rootNode.type !== 'FRAME') {
      warnings.push(`missing_component_root:${comp.rootFrameId}`);
      return;
    }
    root = cloneComponentRootForInstance(rootNode as FrameNode);

    const nodeIdMap = set.nodeIdMapByComponentId?.[selectedComponentId];
    appliedOverrides = remapOverridesForVariant(inst.overrides, nodeIdMap);
  }

  if (root.x !== 0 || root.y !== 0) warnings.push(`component_root_nonzero:${inst.mainComponentId}`);

  prepareInstanceComponentRoot(root, inst, env, appliedOverrides as ComponentInstanceNode['overrides']);

  const pos = insideFlex
    ? `position:relative;left:0;top:0;width:${String(inst.width)}px;height:${String(inst.height)}px;flex:${String(
        inst.layoutGrow ?? 0
      )} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(inst.width)}px;height:${String(
        inst.height
      )}px;`;

  htmlParts.push(
    `<div class="hfc-node-${inst.id} hfc-component-instance" data-hfc-id="${inst.id}" style="z-index:${String(zIndex)}">`
  );
  cssParts.push(`.hfc-node-${inst.id}{${pos}box-sizing:border-box;overflow:hidden;${opRot}}`);
  withInstanceCssScope(inst.id, () => {
    emitScene(
      root,
      originX + inst.x,
      originY + inst.y,
      shiftX,
      shiftY,
      htmlParts,
      cssParts,
      z,
      imgMap,
      patternTiles,
      warnings,
      false,
      env,
      root.children,
      undefined,
      true
    );
  });
  htmlParts.push('</div>');
}

function emitRectangle(
  r: RectangleNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  parentFrame?: FrameNode
): void {
  const shadow = nodeEffectsCss(effectiveRectEffects(r, env), env, r, warnings, 'rect');
  const fillCss = stackedFillsCss(effectiveRectFills(r, env), imgMap, patternTiles, warnings, `rect:${r.id}`, env);
  const stroke = r.strokes?.[0];
  const sw = r.strokeWeight ?? 0;
  const gradientStroke =
    stroke &&
    sw > 0 &&
    stroke.visible !== false &&
    (stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL');
  const border =
    !gradientStroke && stroke && stroke.type === 'SOLID' && sw > 0 && !(r.dashPattern && r.dashPattern.length)
      ? `${String(sw)}px solid ${rgbaFromSolid(stroke)}`
      : 'none';
  const [tl0, tr0, br0, bl0] = rectCornerRadii(r);
  const [tl, tr, br, bl] = clampRectCornerRadiiToBox(r.width, r.height, tl0, tr0, br0, bl0);
  const radius =
    tl > 0 || tr > 0 || br > 0 || bl > 0
      ? tl === tr && tr === br && br === bl
        ? `border-radius:${String(tl)}px;`
        : `border-radius:${String(tl)}px ${String(tr)}px ${String(br)}px ${String(bl)}px;`
      : '';
  const pos = insideFlex
    ? sceneChildPos(r, insideFlex, absX, absY, parentFrame)
    : r.constraints && parentFrame
      ? constraintPositionCss(r, parentFrame.width, parentFrame.height)
      : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(r.width)}px;height:${String(r.height)}px;`;
  htmlParts.push(`<div class="hfc-node-${r.id}" data-hfc-id="${r.id}" style="z-index:${String(zIndex)}">`);
  if (!gradientStroke && r.dashPattern?.length && stroke?.type === 'SOLID' && sw > 0) {
    cssParts.push(
      `${hfcNodeCssSel(r.id)}{${pos}box-sizing:border-box;${fillCss}border:${String(sw)}px dashed ${rgbaFromSolid(stroke)};${radius}${opRot}${shadow}}`
    );
  } else {
    cssParts.push(
      `${hfcNodeCssSel(r.id)}{${pos}box-sizing:border-box;${fillCss}border:${border};${radius}${opRot}${shadow}}`
    );
  }
  if (gradientStroke) {
    const gradId = `stroke-grad-${r.id}`;
    const defs = svgStrokeGradientDefs(stroke, gradId, r.width, r.height);
    if (defs) {
      const d = booleanOperandPathD(r);
      const cap = mapStrokeCapSvg(r.strokeCap);
      const jn = mapStrokeJoinSvg(r.strokeJoin);
      const dash = r.dashPattern?.length ? dashArrayAttr(r) : '';
      const pad = sw / 2;
      const vbW = r.width + sw;
      const vbH = r.height + sw;
      htmlParts.push(
        `<svg class="hfc-rect-stroke-svg" viewBox="${String(-pad)} ${String(-pad)} ${String(vbW)} ${String(vbH)}" width="100%" height="100%" style="position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}</defs><path d="${escapeAttr(d)}" fill="none" stroke="url(#${gradId})" stroke-width="${String(sw)}" stroke-linecap="${cap}" stroke-linejoin="${jn}"${dash}/></svg>`
      );
    } else {
      warnings.push(`rect_gradient_stroke_unsupported:rect:${r.id}`);
    }
  }
  htmlParts.push('</div>');
}

function emitEllipse(
  e: EllipseNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  imgMap: Record<string, string>,
  patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  parentFrame?: FrameNode
): void {
  if (e.arcData && !isPlainFullEllipse(e.arcData)) {
    emitEllipseArcSvg(
      e,
      absX,
      absY,
      zIndex,
      opRot,
      htmlParts,
      cssParts,
      imgMap,
      patternTiles,
      warnings,
      insideFlex,
      env,
      parentFrame
    );
    return;
  }
  const shadow = nodeEffectsCss(e.effects, env, e, warnings, 'ellipse');
  const fillCss = fillBackgroundStyles(e.fills?.[0], imgMap, patternTiles, warnings, `ellipse:${e.id}`, env);
  const pos = insideFlex
    ? sceneChildPos(e, insideFlex, absX, absY, parentFrame)
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(e.width)}px;height:${String(e.height)}px;`;
  htmlParts.push(`<div class="hfc-node-${e.id}" data-hfc-id="${e.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(
    `${hfcNodeCssSel(e.id)}{${pos}box-sizing:border-box;border-radius:50%;${fillCss}${opRot}${shadow}}`
  );
  const stroke = e.strokes?.[0];
  const sw = e.strokeWeight ?? 0;
  if (stroke?.type === 'SOLID' && sw > 0) {
    cssParts.push(
      `${hfcNodeCssSel(e.id)}{box-shadow:inset 0 0 0 ${String(sw)}px ${rgbaFromSolid(stroke)};}`
    );
  }
  htmlParts.push('</div>');
}

function emitEllipseArcSvg(
  e: EllipseNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  imgMap: Record<string, string>,
  _patternTiles: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope,
  parentFrame?: FrameNode
): void {
  const w = e.width;
  const h = e.height;
  const d = ellipseArcPathD(w, h, e.arcData!);
  const fill = e.fills?.[0];
  let fillAttr = 'fill="transparent"';
  if (fill && fill.type === 'SOLID' && (fill.visible === undefined || fill.visible)) {
    fillAttr = `fill="${escapeAttr(rgbaFromSolid(fill))}"`;
  } else if (fill && (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL')) {
    fillAttr = `fill="url(#grad-${e.id})"`;
  } else if (fill?.type === 'IMAGE') {
    fillAttr = `fill="url(#img-${e.id})"`;
  }
  const shadow = nodeEffectsCss(e.effects, env, e, warnings, 'ellipse');
  const pos = insideFlex
    ? sceneChildPos(e, insideFlex, absX, absY, parentFrame)
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;`;
  htmlParts.push(`<div class="hfc-node-${e.id}" data-hfc-id="${e.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`${hfcNodeCssSel(e.id)}{${pos}box-sizing:border-box;${opRot}${shadow}}`);
  let defs = '';
  if (fill?.type === 'GRADIENT_LINEAR') {
    const { x1, y1, x2, y2 } = svgLinearGradientEndpoints(fill, w, h);
    defs += `<linearGradient id="grad-${e.id}" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</linearGradient>`;
  } else if (fill?.type === 'GRADIENT_RADIAL') {
    const ra = svgRadialGradientAttrs(fill);
    const gt = ra.gradientTransform ? ` gradientTransform="${ra.gradientTransform}"` : '';
    defs += `<radialGradient id="grad-${e.id}" gradientUnits="objectBoundingBox" cx="${ra.cx}" cy="${ra.cy}" r="${ra.r}"${gt}>`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</radialGradient>`;
  }
  if (fill?.type === 'IMAGE') {
    const url = imgMap[fill.imageHash];
    if (url) {
      defs += `<pattern id="img-${e.id}" patternUnits="userSpaceOnUse" width="${String(w)}" height="${String(h)}"><image href="${escapeAttr(url)}" width="${String(w)}" height="${String(h)}" preserveAspectRatio="xMidYMid slice"/></pattern>`;
    } else {
      warnings.push(`missing_image_data_url:ellipse:${fill.imageHash}`);
    }
  }
  const sw = e.strokeWeight ?? 0;
  const sp = e.strokes?.[0];
  const strokePart =
    sp && sp.type === 'SOLID' && sw > 0
      ? ` ${svgStrokeAttrs({ strokes: e.strokes, strokeWeight: sw, strokeCap: e.strokeCap, strokeJoin: e.strokeJoin })}${dashArrayAttr(e)}`
      : '';
  htmlParts.push(
    `<svg class="hfc-shape-svg" viewBox="0 0 ${String(w)} ${String(h)}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${defs ? `<defs>${defs}</defs>` : ''}<path d="${escapeAttr(d)}" ${fillAttr}${strokePart}/></svg></div>`
  );
}

/** SVG layout for LINE: bake rotation into endpoints; pad viewBox for stroke caps. */
function lineSvgLayout(ln: LineNode): {
  vbW: number;
  vbH: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  svgW: number;
  svgH: number;
  svgLeft: number;
  svgTop: number;
} {
  const w = ln.width;
  const h = ln.height;
  const sw = ln.strokeWeight ?? 1;
  const pad = sw / 2;
  let p1 = { x: 0, y: 0 };
  let p2 = { x: w, y: h };
  const rot = ln.rotation ?? 0;
  // Figma rotates around the node top-left (same as rectangles), not the segment midpoint.
  if (rot !== 0) {
    p1 = rotatePointFigma(0, 0, p1.x, p1.y, rot);
    p2 = rotatePointFigma(0, 0, p2.x, p2.y, rot);
  }
  const minX = Math.min(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxX = Math.max(p1.x, p2.x);
  const maxY = Math.max(p1.y, p2.y);
  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  const vbW = round3(maxX - minX + 2 * pad);
  const vbH = round3(maxY - minY + 2 * pad);
  return {
    vbW,
    vbH,
    x1: round3(p1.x - minX + pad),
    y1: round3(p1.y - minY + pad),
    x2: round3(p2.x - minX + pad),
    y2: round3(p2.y - minY + pad),
    svgW: vbW,
    svgH: vbH,
    svgLeft: round3(minX - pad),
    svgTop: round3(minY - pad),
  };
}

function emitLine(
  ln: LineNode,
  absX: number,
  absY: number,
  zIndex: number,
  _opRot: string,
  htmlParts: string[],
  cssParts: string[],
  _imgMap: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope
): void {
  const w = ln.width;
  const h = ln.height;
  const { vbW, vbH, x1, y1, x2, y2, svgW, svgH, svgLeft, svgTop } = lineSvgLayout(ln);
  const shadow = nodeEffectsCss(ln.effects, env, ln, warnings, 'line');
  const stroke = ln.strokes[0];
  const col = stroke.type === 'SOLID' ? rgbaFromSolid(stroke) : '#000';
  const dash = ln.dashPattern?.length ? ` stroke-dasharray="${escapeAttr(ln.dashPattern.map((x) => String(x)).join(' '))}"` : '';
  const cap = mapStrokeCapSvg(ln.strokeCap);
  const sw = ln.strokeWeight ?? 1;
  const pos = insideFlex
    ? `position:relative;left:0;top:0;width:${String(w)}px;height:${String(h)}px;flex:${String(ln.layoutGrow ?? 0)} 1 auto;min-width:0;overflow:visible;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;overflow:visible;`;
  htmlParts.push(`<div class="hfc-node-${ln.id}" data-hfc-id="${ln.id}" style="z-index:${String(zIndex)}">`);
  const visualCss = transformOpacityCss(ln, { skipRotation: true });
  cssParts.push(`${hfcNodeCssSel(ln.id)}{${pos}${visualCss}${shadow}}`);
  htmlParts.push(
    `<svg class="hfc-line-svg" viewBox="0 0 ${String(vbW)} ${String(vbH)}" width="${String(svgW)}" height="${String(svgH)}" style="position:absolute;left:${String(svgLeft)}px;top:${String(svgTop)}px;overflow:visible" xmlns="http://www.w3.org/2000/svg"><line x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}" stroke="${escapeAttr(col)}" stroke-width="${String(sw)}" stroke-linecap="${cap}" fill="none"${dash}/></svg></div>`
  );
}

function emitPolygon(
  p: PolygonNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  imgMap: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope
): void {
  const w = p.width;
  const h = p.height;
  const d = polygonPointsD(p.pointCount, w, h);
  const fill = p.fills?.[0];
  let fillAttr = 'fill="transparent"';
  if (fill && fill.type === 'SOLID' && (fill.visible === undefined || fill.visible)) {
    fillAttr = `fill="${escapeAttr(rgbaFromSolid(fill))}"`;
  } else if (fill && (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL')) {
    fillAttr = `fill="url(#grad-${p.id})"`;
  } else if (fill?.type === 'IMAGE') {
    fillAttr = `fill="url(#img-${p.id})"`;
  }
  const shadow = nodeEffectsCss(p.effects, env, p, warnings, 'polygon');
  const pos = insideFlex
    ? `position:relative;left:0;top:0;width:${String(w)}px;height:${String(h)}px;flex:${String(p.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;`;
  htmlParts.push(`<div class="hfc-node-${p.id}" data-hfc-id="${p.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`${hfcNodeCssSel(p.id)}{${pos}${opRot}${shadow}}`);
  let defs = '';
  if (fill?.type === 'GRADIENT_LINEAR') {
    const { x1, y1, x2, y2 } = svgLinearGradientEndpoints(fill, w, h);
    defs += `<linearGradient id="grad-${p.id}" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</linearGradient>`;
  } else if (fill?.type === 'GRADIENT_RADIAL') {
    const ra = svgRadialGradientAttrs(fill);
    const gt = ra.gradientTransform ? ` gradientTransform="${ra.gradientTransform}"` : '';
    defs += `<radialGradient id="grad-${p.id}" gradientUnits="objectBoundingBox" cx="${ra.cx}" cy="${ra.cy}" r="${ra.r}"${gt}>`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</radialGradient>`;
  }
  if (fill?.type === 'IMAGE') {
    const url = imgMap[fill.imageHash];
    if (url) {
      defs += `<pattern id="img-${p.id}" patternUnits="userSpaceOnUse" width="${String(w)}" height="${String(h)}"><image href="${escapeAttr(url)}" width="${String(w)}" height="${String(h)}" preserveAspectRatio="xMidYMid slice"/></pattern>`;
    } else {
      warnings.push(`missing_image_data_url:polygon:${fill.imageHash}`);
    }
  }
  const sw = p.strokeWeight ?? 0;
  const sp = p.strokes?.[0];
  const strokePart =
    sp && sp.type === 'SOLID' && sw > 0
      ? ` ${svgStrokeAttrs({ strokes: p.strokes, strokeWeight: sw, strokeCap: p.strokeCap, strokeJoin: p.strokeJoin })}${dashArrayAttr(p)}`
      : '';
  htmlParts.push(
    `<svg class="hfc-shape-svg" viewBox="0 0 ${String(w)} ${String(h)}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${defs ? `<defs>${defs}</defs>` : ''}<path d="${escapeAttr(d)}" ${fillAttr}${strokePart}/></svg></div>`
  );
}

function emitStar(
  s: StarNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  imgMap: Record<string, string>,
  warnings: string[],
  insideFlex: boolean,
  env: FileEnvelope
): void {
  const w = s.width;
  const h = s.height;
  const d = starPathD(s.pointCount, s.innerRadius, w, h);
  const fill = s.fills?.[0];
  let fillAttr = 'fill="transparent"';
  if (fill && fill.type === 'SOLID' && (fill.visible === undefined || fill.visible)) {
    fillAttr = `fill="${escapeAttr(rgbaFromSolid(fill))}"`;
  } else if (fill && (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL')) {
    fillAttr = `fill="url(#grad-${s.id})"`;
  } else if (fill?.type === 'IMAGE') {
    fillAttr = `fill="url(#img-${s.id})"`;
  }
  const shadow = nodeEffectsCss(s.effects, env, s, warnings, 'star');
  const pos = insideFlex
    ? `position:relative;left:0;top:0;width:${String(w)}px;height:${String(h)}px;flex:${String(s.layoutGrow ?? 0)} 1 auto;min-width:0;`
    : `position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;`;
  htmlParts.push(`<div class="hfc-node-${s.id}" data-hfc-id="${s.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(`${hfcNodeCssSel(s.id)}{${pos}${opRot}${shadow}}`);
  let defs = '';
  if (fill?.type === 'GRADIENT_LINEAR') {
    const { x1, y1, x2, y2 } = svgLinearGradientEndpoints(fill, w, h);
    defs += `<linearGradient id="grad-${s.id}" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">`;
    for (const st of fill.gradientStops) {
      defs += `<stop offset="${String(st.position)}" stop-color="${escapeAttr(rgbaFromRgba(st.color))}"/>`;
    }
    defs += `</linearGradient>`;
  } else if (fill?.type === 'GRADIENT_RADIAL') {
    const ra = svgRadialGradientAttrs(fill);
    const gt = ra.gradientTransform ? ` gradientTransform="${ra.gradientTransform}"` : '';
    defs += `<radialGradient id="grad-${s.id}" gradientUnits="objectBoundingBox" cx="${ra.cx}" cy="${ra.cy}" r="${ra.r}"${gt}>`;
    for (const st of fill.gradientStops) {
      defs += `<stop offset="${String(st.position)}" stop-color="${escapeAttr(rgbaFromRgba(st.color))}"/>`;
    }
    defs += `</radialGradient>`;
  }
  if (fill?.type === 'IMAGE') {
    const url = imgMap[fill.imageHash];
    if (url) {
      defs += `<pattern id="img-${s.id}" patternUnits="userSpaceOnUse" width="${String(w)}" height="${String(h)}"><image href="${escapeAttr(url)}" width="${String(w)}" height="${String(h)}" preserveAspectRatio="xMidYMid slice"/></pattern>`;
    } else {
      warnings.push(`missing_image_data_url:star:${fill.imageHash}`);
    }
  }
  const sw = s.strokeWeight ?? 0;
  const sp = s.strokes?.[0];
  const strokePart =
    sp && sp.type === 'SOLID' && sw > 0
      ? ` ${svgStrokeAttrs({ strokes: s.strokes, strokeWeight: sw, strokeCap: s.strokeCap, strokeJoin: s.strokeJoin })}${dashArrayAttr(s)}`
      : '';
  htmlParts.push(
    `<svg class="hfc-shape-svg" viewBox="0 0 ${String(w)} ${String(h)}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${defs ? `<defs>${defs}</defs>` : ''}<path d="${escapeAttr(d)}" ${fillAttr}${strokePart}/></svg></div>`
  );
}

function normalizeRootBounds(root: SceneNode, raw: Bounds): Bounds {
  return Number.isFinite(raw.minX) ? raw : { minX: 0, minY: 0, maxX: root.width, maxY: root.height };
}

function compileRootScenes(
  roots: SceneNode[],
  options: CompileHtmlOptions,
  envelope: FileEnvelope,
  pageBackgrounds?: Paint[]
): CompiledDesign {
  if (roots.length === 0) {
    throw new Error('compileRootScenes: empty roots');
  }
  /** Figma hugs auto-layout frame dimensions before render; mutate compile-time clone only. */
  for (const root of roots) {
    applyAutoLayoutIntrinsicSizingDeep(root, envelope);
    syncHugTextLayoutMetricsDeep(root, envelope);
  }
  const warnings: string[] = [];
  instanceCssScopeStack.length = 0;
  let b: Bounds | undefined;
  for (const root of roots) {
    const raw = measureScene(root, 0, 0);
    const nb = normalizeRootBounds(root, raw);
    if (raw !== nb) warnings.push('bounds_fallback:non_finite');
    b = b ? unionBounds(b, nb) : nb;
  }
  const bounds = b!;

  const pad = options.viewportPaddingPx;
  const contentW = Math.max(0, bounds.maxX - bounds.minX);
  const contentH = Math.max(0, bounds.maxY - bounds.minY);
  const shiftX = pad - bounds.minX;
  const shiftY = pad - bounds.minY;
  const W = contentW + 2 * pad;
  const H = contentH + 2 * pad;

  const htmlParts: string[] = [];
  const cssParts: string[] = [];
  const rootVarCss = buildRootCssVariableBlock(envelope);
  if (rootVarCss) {
    cssParts.push(rootVarCss);
  }
  const z = { value: 0 };
  const imgMap = options.imageDataUrlByHash ?? {};
  const patternTiles = options.patternTileDataUrlByNodeId ?? {};
  for (const root of roots) {
    emitScene(root, 0, 0, shiftX, shiftY, htmlParts, cssParts, z, imgMap, patternTiles, warnings, false, envelope, null);
  }

  const pageBg =
    pageBackgrounds?.[0] && pageBackgrounds[0].visible !== false
      ? fillBackgroundStyles(pageBackgrounds[0], imgMap, patternTiles, warnings, 'page_canvas', envelope)
      : '';
  const cssBlock = `${HFC_UA_RESET_CSS}\n#hfc-root{position:relative;width:${String(W)}px;height:${String(H)}px;isolation:isolate;${pageBg}}\n${cssParts.join('\n')}`;
  const primary = roots[0]!;
  const rootClip: Rect =
    roots.length === 1
      ? {
          x: primary.x + shiftX,
          y: primary.y + shiftY,
          width: primary.width,
          height: primary.height,
        }
      : {
          x: bounds.minX + shiftX,
          y: bounds.minY + shiftY,
          width: contentW,
          height: contentH,
        };

  const inline = options.inlineCss;
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style id="hfc-compiled-css">
${inline ? cssBlock : '/* css attached separately */'}
    </style>
  </head>
  <body style="margin:0;background:transparent;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,'Apple Color Emoji','Segoe UI Emoji';">
    <div id="hfc-root" style="position:relative;width:${String(W)}px;height:${String(H)}px;">
      ${htmlParts.join('')}
    </div>
  </body>
</html>`;

  return {
    html,
    css: inline ? '' : cssBlock,
    warnings,
    bounds: { x: bounds.minX, y: bounds.minY, width: contentW, height: contentH },
    rootClip,
    viewportWidth: W,
    viewportHeight: H,
  };
}

export const designCompiler: DesignCompiler = {
  compileSubtree({ envelope, rootNodeId, options }): CompiledDesign {
    const env = structuredClone(envelope);
    const page = findPageById(env, rootNodeId);
    if (page) {
      return compilePageNode(page, options, env);
    }
    const root = findSceneNode(env, rootNodeId);
    if (!root) {
      throw new Error(`compileSubtree: unknown node id ${rootNodeId}`);
    }
    const rootCloned = findSceneNode(env, rootNodeId);
    if (!rootCloned) {
      throw new Error(`compileSubtree: unknown node id ${rootNodeId} after clone`);
    }
    const containingPage = findPageForSceneNode(env, rootNodeId);
    return compileRootScenes([rootCloned], options, env, containingPage?.backgrounds);
  },

  compileFirstPage({ envelope, options, pageId }): CompiledDesign {
    const env = structuredClone(envelope);
    const page = pageId
      ? findPageById(env, pageId)
      : env.document.children.find((c): c is PageNode => c.type === 'PAGE');
    if (!page) {
      throw new Error('compileFirstPage: unknown page');
    }
    return compilePageNode(page, options, env);
  },
};
