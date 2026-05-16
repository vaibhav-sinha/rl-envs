import type { FileEnvelope, PageNode, PatternPaint, SceneNode } from '../model/types.js';
import type { CompileHtmlOptions, CompiledDesign, DesignCompiler } from './DesignCompiler.js';

function findPageById(envelope: FileEnvelope, pageId: string): PageNode | null {
  return envelope.document.children.find((c): c is PageNode => c.type === 'PAGE' && c.id === pageId) ?? null;
}
import type { PlaywrightScreenshotService } from '../screenshot/PlaywrightScreenshotService.js';

function sceneChildren(n: SceneNode): SceneNode[] | null {
  if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
    return n.children;
  }
  if (n.type === 'BOOLEAN_OPERATION') return n.children;
  return null;
}

export function findSceneNode(envelope: FileEnvelope, id: string): SceneNode | null {
  for (const page of envelope.document.children) {
    const hit = findInList(page.children, id);
    if (hit) return hit;
  }
  return null;
}

function findInList(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const ch = sceneChildren(n);
    if (ch) {
      const inner = findInList(ch, id);
      if (inner) return inner;
    }
  }
  return null;
}

function walkPaints(node: SceneNode, visit: (p: PatternPaint) => void): void {
  const paints: import('../model/types.js').Paint[] = [];
  if ('fills' in node && node.fills) paints.push(...node.fills);
  if ('strokes' in node && node.strokes) paints.push(...node.strokes);
  for (const p of paints) {
    if (p.type === 'PATTERN') visit(p);
  }
  const ch = sceneChildren(node);
  if (ch) for (const c of ch) walkPaints(c, visit);
}

function walkPaintsUnderRoot(envelope: FileEnvelope, rootNodeId: string, visit: (p: PatternPaint) => void): void {
  const page = findPageById(envelope, rootNodeId);
  if (page) {
    for (const child of page.children) walkPaints(child, visit);
    return;
  }
  const root = findSceneNode(envelope, rootNodeId);
  if (root) walkPaints(root, visit);
}

/** Unique pattern source node ids referenced under `rootNodeId` (scene node or PAGE). */
export function collectPatternSourceIds(envelope: FileEnvelope, rootNodeId: string): string[] {
  const ids = new Set<string>();
  walkPaintsUnderRoot(envelope, rootNodeId, (p) => ids.add(p.sourceNodeId));
  return [...ids];
}

function maxScalingForSource(envelope: FileEnvelope, rootNodeId: string, sourceId: string): number {
  let max = 1;
  walkPaintsUnderRoot(envelope, rootNodeId, (p) => {
    if (p.sourceNodeId === sourceId) max = Math.max(max, p.scalingFactor);
  });
  return max;
}

/**
 * Figma pattern spacing is a multiple of the scaled tile size (see Plugin API example: 0.2 on a 10×10 tile).
 * `spacing: { x: 8, y: 8 }` means 8× the tile width/height as gap, not 8px.
 */
export function patternSpacingPx(
  spacing: { x: number; y: number } | undefined,
  tileW: number,
  tileH: number
): { x: number; y: number } {
  if (!spacing) return { x: 0, y: 0 };
  return {
    x: Math.max(0, spacing.x * tileW),
    y: Math.max(0, spacing.y * tileH),
  };
}

export function patternBackgroundPosition(
  horizontal?: 'START' | 'CENTER' | 'END',
  vertical?: 'START' | 'CENTER' | 'END'
): string {
  const x = horizontal === 'END' ? '100%' : horizontal === 'CENTER' ? 'center' : '0';
  const y = vertical === 'END' ? '100%' : vertical === 'CENTER' ? 'center' : '0';
  return `${x} ${y}`;
}

export function patternRepeatCellSize(
  fill: PatternPaint,
  tileW: number,
  tileH: number
): { stepX: number; stepY: number; tileRenderW: number; tileRenderH: number } {
  const tileRenderW = Math.max(1, tileW * fill.scalingFactor);
  const tileRenderH = Math.max(1, tileH * fill.scalingFactor);
  const gap = patternSpacingPx(fill.spacing, tileRenderW, tileRenderH);
  return {
    tileRenderW,
    tileRenderH,
    stepX: tileRenderW + gap.x,
    stepY: tileRenderH + gap.y,
  };
}

function rgbaFromSolid(color: { r: number; g: number; b: number }, opacity?: number): string {
  const a = opacity ?? 1;
  return `rgba(${String(Math.round(color.r * 255))},${String(Math.round(color.g * 255))},${String(Math.round(color.b * 255))},${String(a)})`;
}

function shapeSvgBody(node: SceneNode, color: string): string | null {
  if (!('width' in node) || !('height' in node)) return null;
  const w = Math.max(1, node.width);
  const h = Math.max(1, node.height);
  if (node.type === 'ELLIPSE') {
    return `<ellipse cx="${String(w / 2)}" cy="${String(h / 2)}" rx="${String(w / 2)}" ry="${String(h / 2)}" fill="${color}"/>`;
  }
  if (node.type === 'RECTANGLE') {
    const r = node.cornerRadius ?? 0;
    return `<rect width="${String(w)}" height="${String(h)}" rx="${String(r)}" fill="${color}"/>`;
  }
  return null;
}

/** Fast SVG tile for simple solid shapes (unit tests / compile_html without Playwright). */
export function buildSyncPatternTileDataUrl(envelope: FileEnvelope, sourceNodeId: string): string | null {
  const node = findSceneNode(envelope, sourceNodeId);
  if (!node) return null;
  const fill = 'fills' in node ? node.fills?.[0] : undefined;
  if (fill?.type !== 'SOLID') return null;
  const body = shapeSvgBody(node, rgbaFromSolid(fill.color, fill.opacity));
  if (!body) return null;
  const w = Math.max(1, node.width);
  const h = Math.max(1, node.height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(w)}" height="${String(h)}">${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** SVG repeat cell with transparent spacing (matches Figma pattern grid). */
export function buildPatternTileSvgDataUrl(envelope: FileEnvelope, fill: PatternPaint): string | null {
  const node = findSceneNode(envelope, fill.sourceNodeId);
  if (!node) return null;
  const paint = 'fills' in node ? node.fills?.[0] : undefined;
  if (paint?.type !== 'SOLID') return null;
  const body = shapeSvgBody(node, rgbaFromSolid(paint.color, paint.opacity));
  if (!body) return null;
  const { stepX, stepY } = patternRepeatCellSize(fill, node.width, node.height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(stepX)}" height="${String(stepY)}" viewBox="0 0 ${String(stepX)} ${String(stepY)}">${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function representativePatternPaint(
  envelope: FileEnvelope,
  rootNodeId: string,
  sourceId: string
): PatternPaint | null {
  let best: PatternPaint | null = null;
  walkPaintsUnderRoot(envelope, rootNodeId, (p) => {
    if (p.sourceNodeId !== sourceId) return;
    if (!best || p.scalingFactor > best.scalingFactor) best = p;
  });
  return best;
}

export async function rasterizePatternTileDataUrls(params: {
  envelope: FileEnvelope;
  rootNodeId: string;
  compileOptions: CompileHtmlOptions;
  screenshot: PlaywrightScreenshotService;
  timeoutMs: number;
  designCompiler: DesignCompiler;
}): Promise<Record<string, string>> {
  const sourceIds = collectPatternSourceIds(params.envelope, params.rootNodeId);
  const out: Record<string, string> = {};
  for (const sourceId of sourceIds) {
    const node = findSceneNode(params.envelope, sourceId);
    if (!node || !('width' in node) || !('height' in node)) continue;
    const rep =
      representativePatternPaint(params.envelope, params.rootNodeId, sourceId) ??
      ({
        type: 'PATTERN',
        sourceNodeId: sourceId,
        tileType: 'RECTANGULAR',
        scalingFactor: maxScalingForSource(params.envelope, params.rootNodeId, sourceId),
      } satisfies PatternPaint);
    const svg = buildPatternTileSvgDataUrl(params.envelope, rep);
    if (svg) {
      out[sourceId] = svg;
      continue;
    }
    const compiled: CompiledDesign = params.designCompiler.compileSubtree({
      envelope: params.envelope,
      rootNodeId: sourceId,
      options: {
        ...params.compileOptions,
        viewportPaddingPx: 0,
        patternTileDataUrlByNodeId: {},
      },
    });
    const shot = await params.screenshot.capture({
      compiled,
      clipRect: compiled.rootClip,
      format: 'png',
      scale: 1,
      deviceScaleFactor: 1,
      background: 'transparent',
      timeoutMs: params.timeoutMs,
    });
    out[sourceId] = `data:image/png;base64,${shot.bytes.toString('base64')}`;
  }
  return out;
}
