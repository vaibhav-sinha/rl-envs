import type { FileEnvelope } from '../model/types.js';
import type { FrameNode, SceneNode, SolidPaint, StyledSegment, TextNode } from '../model/types.js';
import type { DropShadowEffect } from '../model/types.js';

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

function dropShadowCss(effects: FrameNode['effects']): string {
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
  return s;
}

function overflowClipCss(clips: boolean | undefined): string {
  return clips ? 'overflow:hidden;' : '';
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
      chunks.push(
        `<span style="${spanStyle({})}">${escapeHtmlText(slice)}</span>`
      );
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

function emitScene(
  n: SceneNode,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number }
): void {
  const absX = originX + n.x + shiftX;
  const absY = originY + n.y + shiftY;
  const zIndex = z.value++;
  const opRot = transformOpacityCss(n);

  if (n.type === 'TEXT') {
    const t = n;
    const shadow = dropShadowCss(t.effects);
    htmlParts.push(
      `<div class="hfc-node-${t.id}" data-hfc-id="${t.id}" style="z-index:${String(zIndex)}">`
    );
    cssParts.push(
      `.hfc-node-${t.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(t.width)}px;height:${String(t.height)}px;box-sizing:border-box;white-space:pre-wrap;word-break:break-word;${opRot}${shadow}}`
    );
    htmlParts.push(`<div class="hfc-text-inner">${emitTextInnerHtml(t)}</div></div>`);
    return;
  }

  const f = n;
  const fill = f.fills?.[0];
  const bg =
    fill && fill.type === 'SOLID' && (fill.visible === undefined || fill.visible)
      ? rgbaFromSolid(fill)
      : 'transparent';
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
    htmlParts.push(
      `<div class="hfc-node-${f.id}" data-hfc-id="${f.id}" style="z-index:${String(zIndex)}">`
    );
    cssParts.push(
      `.hfc-node-${f.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(f.width)}px;height:${String(f.height)}px;box-sizing:border-box;background-color:${bg};border:${border};${clip}${opRot}${shadow}}`
    );
    for (const c of f.children) {
      emitScene(c, originX + f.x, originY + f.y, shiftX, shiftY, htmlParts, cssParts, z);
    }
    htmlParts.push('</div>');
    return;
  }

  const bgPaint = f.backgrounds?.[0];
  const bgCss =
    bgPaint && bgPaint.type === 'SOLID' && (bgPaint.visible === undefined || bgPaint.visible)
      ? rgbaFromSolid(bgPaint)
      : 'transparent';

  htmlParts.push(
    `<div class="hfc-node-${f.id}" data-hfc-id="${f.id}" style="z-index:${String(zIndex)}">`
  );
  cssParts.push(
    `.hfc-node-${f.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(f.width)}px;height:${String(f.height)}px;box-sizing:border-box;border:${border};background-color:transparent;${clip}${opRot}${shadow}}`
  );
  cssParts.push(
    `.hfc-node-${f.id} > .hfc-bg-layer{background-color:${bgCss};}.hfc-node-${f.id} > .hfc-fill-layer{background-color:${bg};}`
  );
  htmlParts.push(`<div class="hfc-bg-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:0"></div>`);
  htmlParts.push(`<div class="hfc-fill-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:1"></div>`);
  for (const c of f.children) {
    emitScene(c, originX + f.x, originY + f.y, shiftX, shiftY, htmlParts, cssParts, z);
  }
  htmlParts.push('</div>');
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
  for (const root of roots) {
    emitScene(root, 0, 0, shiftX, shiftY, htmlParts, cssParts, z);
  }

  const cssBlock = `#hfc-root{position:relative;width:${String(W)}px;height:${String(H)}px;}\n${cssParts.join('\n')}`;
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
