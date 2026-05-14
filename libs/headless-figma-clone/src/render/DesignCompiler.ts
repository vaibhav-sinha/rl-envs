import type { FileEnvelope } from '../model/types.js';
import type { FrameNode } from '../model/types.js';
import type { SolidPaint } from '../model/types.js';

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
  /** All top-level frames on the document's first page (same page `findFirstFrameId` uses). */
  compileFirstPage(params: { envelope: FileEnvelope; options: CompileHtmlOptions }): CompiledDesign;
}

function findFrame(envelope: FileEnvelope, id: string): FrameNode | null {
  for (const page of envelope.document.children) {
    const hit = findFrameInList(page.children, id);
    if (hit) return hit;
  }
  return null;
}

function findFrameInList(nodes: FrameNode[], id: string): FrameNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const inner = findFrameInList(n.children, id);
    if (inner) return inner;
  }
  return null;
}

function rgbaFromSolid(p: SolidPaint): string {
  const { r, g, b } = p.color;
  const a = p.opacity !== undefined ? p.opacity : 1;
  return `rgba(${String(Math.round(r * 255))},${String(Math.round(g * 255))},${String(Math.round(b * 255))},${String(a)})`;
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

function measureFrame(f: FrameNode, originX: number, originY: number): Bounds {
  const absX = originX + f.x;
  const absY = originY + f.y;
  let b: Bounds = {
    minX: absX,
    minY: absY,
    maxX: absX + f.width,
    maxY: absY + f.height,
  };
  for (const c of f.children) {
    b = unionBounds(b, measureFrame(c, absX, absY));
  }
  return b;
}

function emitFrame(
  f: FrameNode,
  originX: number,
  originY: number,
  shiftX: number,
  shiftY: number,
  htmlParts: string[],
  cssParts: string[],
  z: { value: number }
): void {
  const absX = originX + f.x + shiftX;
  const absY = originY + f.y + shiftY;
  const zIndex = z.value++;
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

  htmlParts.push(
    `<div class="hfc-node-${f.id}" data-hfc-id="${f.id}" style="z-index:${String(zIndex)}">`
  );
  cssParts.push(
    `.hfc-node-${f.id}{position:absolute;left:${String(absX)}px;top:${String(absY)}px;width:${String(f.width)}px;height:${String(f.height)}px;box-sizing:border-box;background-color:${bg};border:${border};}`
  );
  for (const c of f.children) {
    emitFrame(c, originX + f.x, originY + f.y, shiftX, shiftY, htmlParts, cssParts, z);
  }
  htmlParts.push('</div>');
}

function normalizeRootBounds(root: FrameNode, raw: Bounds): Bounds {
  return Number.isFinite(raw.minX) ? raw : { minX: 0, minY: 0, maxX: root.width, maxY: root.height };
}

function compileRootFrames(roots: FrameNode[], options: CompileHtmlOptions): CompiledDesign {
  if (roots.length === 0) {
    throw new Error('compileRootFrames: empty roots');
  }
  const warnings: string[] = [];
  let b: Bounds | undefined;
  for (const root of roots) {
    const raw = measureFrame(root, 0, 0);
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
    emitFrame(root, 0, 0, shiftX, shiftY, htmlParts, cssParts, z);
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
    const root = findFrame(envelope, rootNodeId);
    if (!root) {
      throw new Error(`compileSubtree: unknown FRAME id ${rootNodeId}`);
    }
    return compileRootFrames([root], options);
  },

  compileFirstPage({ envelope, options }): CompiledDesign {
    const page = envelope.document.children[0];
    if (!page || page.children.length === 0) {
      throw new Error('compileFirstPage: no frames on first page');
    }
    return compileRootFrames(page.children, options);
  },
};
