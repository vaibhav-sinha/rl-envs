import type { BlendMode, FileEnvelope } from '../model/types.js';
import type {
  DropShadowEffect,
  Effect,
  EllipseNode,
  FrameNode,
  GradientPaint,
  LineNode,
  Paint,
  PolygonNode,
  RectangleNode,
  SceneNode,
  SolidPaint,
  StarNode,
  StyledSegment,
  TextNode,
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
};

export interface DesignCompiler {
  compileSubtree(params: {
    envelope: FileEnvelope;
    rootNodeId: string;
    options: CompileHtmlOptions;
  }): CompiledDesign;
  /** All top-level scene nodes on the document's first page. */
  compileFirstPage(params: { envelope: FileEnvelope; options: CompileHtmlOptions }): CompiledDesign;
}

function findSceneNode(envelope: FileEnvelope, id: string): SceneNode | null {
  for (const page of envelope.document.children) {
    const hit = findSceneInList(page.children, id);
    if (hit) return hit;
  }
  return null;
}

function findSceneInList(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.type === 'FRAME') {
      const inner = findSceneInList(n.children, id);
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

function rgbaFromEffectColor(c: { r: number; g: number; b: number; a?: number }): string {
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

function measureScene(n: SceneNode, originX: number, originY: number): Bounds {
  const absX = originX + n.x;
  const absY = originY + n.y;
  let b: Bounds = {
    minX: absX,
    minY: absY,
    maxX: absX + n.width,
    maxY: absY + n.height,
  };
  if (n.type === 'FRAME') {
    for (const c of n.children) {
      b = unionBounds(b, measureScene(c, absX, absY));
    }
  }
  return b;
}

function frameNeedsLayeredBackground(f: FrameNode): boolean {
  return (f.backgrounds?.length ?? 0) > 0;
}

function dropShadowCss(effects: Effect[] | undefined): string {
  if (!effects?.length) return '';
  const parts: string[] = [];
  for (const e of effects) {
    if (e.type !== 'DROP_SHADOW') continue;
    if (e.visible === false) continue;
    const ds = e as DropShadowEffect;
    const ox = ds.offset.x;
    const oy = ds.offset.y;
    const blur = ds.radius ?? 0;
    const spread = ds.spread ?? 0;
    const col = ds.color ? rgbaFromEffectColor(ds.color) : 'rgba(0,0,0,0.35)';
    parts.push(`${String(ox)}px ${String(oy)}px ${String(blur)}px ${String(spread)}px ${col}`);
  }
  return parts.length ? `box-shadow:${parts.join(',')};` : '';
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

function transformOpacityCss(n: SceneNode): string {
  let s = '';
  if (n.rotation !== undefined && n.rotation !== 0) {
    s += `transform:rotate(${String(n.rotation)}deg);transform-origin:top left;`;
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

function overflowClipCss(clips: boolean | undefined): string {
  return clips ? 'overflow:hidden;' : '';
}

function linearGradientCss(g: GradientPaint): string {
  const stops = [...g.gradientStops].sort((a, b) => a.position - b.position);
  const parts = stops.map((s) => `${rgbaFromRgba(s.color)} ${String(Math.round(s.position * 100))}%`);
  return `linear-gradient(90deg,${parts.join(',')})`;
}

function radialGradientCss(g: GradientPaint): string {
  const stops = [...g.gradientStops].sort((a, b) => a.position - b.position);
  const parts = stops.map((s) => `${rgbaFromRgba(s.color)} ${String(Math.round(s.position * 100))}%`);
  return `radial-gradient(circle at center,${parts.join(',')})`;
}

function fillBackgroundStyles(fill: Paint | undefined, imgMap: Record<string, string>, warnings: string[], label: string): string {
  if (!fill || fill.visible === false) return 'background-color:transparent;';
  if (fill.type === 'SOLID') return `background-color:${rgbaFromSolid(fill)};`;
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
    warnings.push(`pattern_render_simplified:${label}`);
    return 'background-image:repeating-linear-gradient(45deg,#ccc,#ccc 4px,#eee 4px,#eee 8px);';
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

function emitTextInnerHtml(t: TextNode): string {
  const len = t.characters.length;
  const segs = [...(t.styledSegments ?? [])].sort((a, b) => a.start - b.start || a.end - b.end);
  const defaultColor = t.fills?.[0]?.type === 'SOLID' ? rgbaFromSolid(t.fills[0]) : 'rgba(0,0,0,1)';
  const defaultFs = t.fontSize ?? 12;
  const defaultFw = t.fontWeight ?? 400;

  function spanStyle(style: StyledSegment['style']): string {
    const fs = style.fontSize ?? defaultFs;
    const fw = style.fontWeight ?? defaultFw;
    let color = defaultColor;
    if (style.fills?.[0]?.type === 'SOLID') {
      color = rgbaFromSolid(style.fills[0]);
    }
    return `font-size:${String(fs)}px;font-weight:${String(fw)};color:${color};`;
  }

  let i = 0;
  const chunks: string[] = [];
  let linkIdx = 0;
  for (const seg of segs) {
    if (seg.start > i) {
      const slice = t.characters.slice(i, seg.start);
      chunks.push(`<span style="${spanStyle({})}">${escapeHtmlText(slice)}</span>`);
    }
    const slice = t.characters.slice(seg.start, seg.end);
    const inner = escapeHtmlText(slice);
    if (seg.style.hyperlink?.type === 'URL') {
      const href = escapeAttr(seg.style.hyperlink.url);
      chunks.push(
        `<a class="hfc-hyperlink hfc-hyperlink-${String(linkIdx)}" href="${href}" style="${spanStyle(seg.style)}">${inner}</a>`
      );
      linkIdx += 1;
    } else {
      chunks.push(`<span style="${spanStyle(seg.style)}">${inner}</span>`);
    }
    i = seg.end;
  }
  if (i < len) {
    chunks.push(`<span style="${spanStyle({})}">${escapeHtmlText(t.characters.slice(i))}</span>`);
  }
  if (chunks.length === 0) {
    chunks.push(`<span style="${spanStyle({})}">${escapeHtmlText(t.characters)}</span>`);
  }
  return chunks.join('');
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
  warnings: string[]
): void {
  const absX = originX + n.x + shiftX;
  const absY = originY + n.y + shiftY;
  const zIndex = z.value++;
  const opRot = transformOpacityCss(n);

  if (n.type === 'TEXT') {
    const t = n;
    const shadow = dropShadowCss(t.effects);
    htmlParts.push(`<div class="hfc-node-${t.id}" data-hfc-id="${t.id}" style="z-index:${String(zIndex)}">`);
    cssParts.push(
      `.hfc-node-${t.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(t.width)}px;height:${String(t.height)}px;box-sizing:border-box;white-space:pre-wrap;word-break:break-word;${opRot}${shadow}}`
    );
    htmlParts.push(`<div class="hfc-text-inner">${emitTextInnerHtml(t)}</div></div>`);
    return;
  }

  if (n.type === 'FRAME') {
    const f = n;
    const fill = f.fills?.[0];
    const fillCss = fillBackgroundStyles(fill, imgMap, warnings, `frame_fill:${f.id}`);
    const stroke = f.strokes?.[0];
    const sw = f.strokeWeight ?? 0;
    const border =
      stroke && stroke.type === 'SOLID' && sw > 0
        ? `${String(sw)}px solid ${rgbaFromSolid(stroke)}`
        : 'none';
    const shadow = dropShadowCss(f.effects);
    const clip = overflowClipCss(f.clipsContent);
    const layered = frameNeedsLayeredBackground(f);

    if (!layered) {
      htmlParts.push(`<div class="hfc-node-${f.id}" data-hfc-id="${f.id}" style="z-index:${String(zIndex)}">`);
      cssParts.push(
        `.hfc-node-${f.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(f.width)}px;height:${String(f.height)}px;box-sizing:border-box;${fillCss}border:${border};${clip}${opRot}${shadow}}`
      );
      for (const c of f.children) {
        emitScene(c, originX + f.x, originY + f.y, shiftX, shiftY, htmlParts, cssParts, z, imgMap, warnings);
      }
      htmlParts.push('</div>');
      return;
    }

    const bgPaint = f.backgrounds?.[0];
    const bgCss =
      bgPaint && bgPaint.type === 'SOLID' && (bgPaint.visible === undefined || bgPaint.visible)
        ? `background-color:${rgbaFromSolid(bgPaint)};`
        : fillBackgroundStyles(bgPaint, imgMap, warnings, `frame_bg:${f.id}`);

    htmlParts.push(`<div class="hfc-node-${f.id}" data-hfc-id="${f.id}" style="z-index:${String(zIndex)}">`);
    cssParts.push(
      `.hfc-node-${f.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(f.width)}px;height:${String(f.height)}px;box-sizing:border-box;border:${border};background-color:transparent;${clip}${opRot}${shadow}}`
    );
    cssParts.push(
      `.hfc-node-${f.id} > .hfc-bg-layer{${bgCss}}.hfc-node-${f.id} > .hfc-fill-layer{${fillCss}}`
    );
    htmlParts.push(
      `<div class="hfc-bg-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:0"></div>`
    );
    htmlParts.push(
      `<div class="hfc-fill-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:1"></div>`
    );
    for (const c of f.children) {
      emitScene(c, originX + f.x, originY + f.y, shiftX, shiftY, htmlParts, cssParts, z, imgMap, warnings);
    }
    htmlParts.push('</div>');
    return;
  }

  if (n.type === 'RECTANGLE') {
    emitRectangle(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings);
    return;
  }
  if (n.type === 'ELLIPSE') {
    emitEllipse(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings);
    return;
  }
  if (n.type === 'LINE') {
    emitLine(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings);
    return;
  }
  if (n.type === 'POLYGON') {
    emitPolygon(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings);
    return;
  }
  if (n.type === 'STAR') {
    emitStar(n, absX, absY, zIndex, opRot, htmlParts, cssParts, imgMap, warnings);
    return;
  }
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
  warnings: string[]
): void {
  const shadow = dropShadowCss(r.effects);
  const fillCss = fillBackgroundStyles(r.fills?.[0], imgMap, warnings, `rect:${r.id}`);
  const stroke = r.strokes?.[0];
  const sw = r.strokeWeight ?? 0;
  const border =
    stroke && stroke.type === 'SOLID' && sw > 0 && !(r.dashPattern && r.dashPattern.length)
      ? `${String(sw)}px solid ${rgbaFromSolid(stroke)}`
      : 'none';
  const radius = r.cornerRadius !== undefined ? `border-radius:${String(r.cornerRadius)}px;` : '';
  htmlParts.push(`<div class="hfc-node-${r.id}" data-hfc-id="${r.id}" style="z-index:${String(zIndex)}">`);
  if (r.dashPattern?.length && stroke?.type === 'SOLID' && sw > 0) {
    cssParts.push(
      `.hfc-node-${r.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(r.width)}px;height:${String(r.height)}px;box-sizing:border-box;${fillCss}border:${String(sw)}px dashed ${rgbaFromSolid(stroke)};${radius}${opRot}${shadow}}`
    );
  } else {
    cssParts.push(
      `.hfc-node-${r.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(r.width)}px;height:${String(r.height)}px;box-sizing:border-box;${fillCss}border:${border};${radius}${opRot}${shadow}}`
    );
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
  warnings: string[]
): void {
  const shadow = dropShadowCss(e.effects);
  const fillCss = fillBackgroundStyles(e.fills?.[0], imgMap, warnings, `ellipse:${e.id}`);
  htmlParts.push(`<div class="hfc-node-${e.id}" data-hfc-id="${e.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(
    `.hfc-node-${e.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(e.width)}px;height:${String(e.height)}px;box-sizing:border-box;border-radius:50%;${fillCss}${opRot}${shadow}}`
  );
  const stroke = e.strokes?.[0];
  const sw = e.strokeWeight ?? 0;
  if (stroke?.type === 'SOLID' && sw > 0) {
    cssParts.push(
      `.hfc-node-${e.id}{box-shadow:inset 0 0 0 ${String(sw)}px ${rgbaFromSolid(stroke)};}`
    );
  }
  htmlParts.push('</div>');
}

function emitLine(
  ln: LineNode,
  absX: number,
  absY: number,
  zIndex: number,
  opRot: string,
  htmlParts: string[],
  cssParts: string[],
  _imgMap: Record<string, string>,
  _warnings: string[]
): void {
  const w = Math.max(1, ln.width);
  const h = Math.max(1, ln.height);
  const shadow = dropShadowCss(ln.effects);
  const stroke = ln.strokes[0];
  const col = stroke.type === 'SOLID' ? rgbaFromSolid(stroke) : '#000';
  const dash = ln.dashPattern?.length ? ` stroke-dasharray="${escapeAttr(ln.dashPattern.map((x) => String(x)).join(' '))}"` : '';
  const cap = mapStrokeCapSvg(ln.strokeCap);
  htmlParts.push(`<div class="hfc-node-${ln.id}" data-hfc-id="${ln.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(
    `.hfc-node-${ln.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;${opRot}${shadow}}`
  );
  htmlParts.push(
    `<svg class="hfc-line-svg" viewBox="0 0 ${String(w)} ${String(h)}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><line x1="0" y1="0" x2="${String(w)}" y2="${String(h)}" stroke="${escapeAttr(col)}" stroke-width="${String(ln.strokeWeight)}" stroke-linecap="${cap}" fill="none"${dash}/></svg></div>`
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
  warnings: string[]
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
  const shadow = dropShadowCss(p.effects);
  htmlParts.push(`<div class="hfc-node-${p.id}" data-hfc-id="${p.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(
    `.hfc-node-${p.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;${opRot}${shadow}}`
  );
  let defs = '';
  if (fill?.type === 'GRADIENT_LINEAR') {
    defs += `<linearGradient id="grad-${p.id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${String(w)}" y2="0">`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</linearGradient>`;
  } else if (fill?.type === 'GRADIENT_RADIAL') {
    defs += `<radialGradient id="grad-${p.id}" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="50%">`;
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
  warnings: string[]
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
  const shadow = dropShadowCss(s.effects);
  htmlParts.push(`<div class="hfc-node-${s.id}" data-hfc-id="${s.id}" style="z-index:${String(zIndex)}">`);
  cssParts.push(
    `.hfc-node-${s.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(w)}px;height:${String(h)}px;${opRot}${shadow}}`
  );
  let defs = '';
  if (fill?.type === 'GRADIENT_LINEAR') {
    defs += `<linearGradient id="grad-${s.id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${String(w)}" y2="0">`;
    for (const st of fill.gradientStops) {
      defs += `<stop offset="${String(st.position)}" stop-color="${escapeAttr(rgbaFromRgba(st.color))}"/>`;
    }
    defs += `</linearGradient>`;
  } else if (fill?.type === 'GRADIENT_RADIAL') {
    defs += `<radialGradient id="grad-${s.id}" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="50%">`;
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

function compileRootScenes(roots: SceneNode[], options: CompileHtmlOptions): CompiledDesign {
  if (roots.length === 0) {
    throw new Error('compileRootScenes: empty roots');
  }
  const warnings: string[] = [];
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
  const z = { value: 0 };
  const imgMap = options.imageDataUrlByHash ?? {};
  for (const root of roots) {
    emitScene(root, 0, 0, shiftX, shiftY, htmlParts, cssParts, z, imgMap, warnings);
  }

  const cssBlock = `#hfc-root{position:relative;width:${String(W)}px;height:${String(H)}px;isolation:isolate;}\n${cssParts.join('\n')}`;
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
    const root = findSceneNode(envelope, rootNodeId);
    if (!root) {
      throw new Error(`compileSubtree: unknown scene node id ${rootNodeId}`);
    }
    return compileRootScenes([root], options);
  },

  compileFirstPage({ envelope, options }): CompiledDesign {
    const page = envelope.document.children[0];
    if (!page || page.children.length === 0) {
      throw new Error('compileFirstPage: no scene nodes on first page');
    }
    return compileRootScenes(page.children, options);
  },
};
