import type { FileEnvelope, ImagePaint, Paint } from '../model/types.js';
import { svgLinearGradientEndpoints, svgRadialGradientAttrs } from './gradientCss.js';
import { rgbaFromSolid } from './strokeRender.js';

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function rgbaFromRgba(c: { r: number; g: number; b: number; a?: number }): string {
  const a = c.a ?? 1;
  return `rgba(${String(Math.round(c.r * 255))},${String(Math.round(c.g * 255))},${String(Math.round(c.b * 255))},${String(a)})`;
}

function imagePatternPreserveAspectRatio(scaleMode: ImagePaint['scaleMode'] | undefined): string {
  if (scaleMode === 'FIT') return 'xMidYMid meet';
  if (scaleMode === 'STRETCH') return 'none';
  return 'xMidYMid slice';
}

function appendSvgFillDefs(
  fill: Paint,
  layerKey: string,
  w: number,
  h: number,
  imgMap: Record<string, string>,
  warnings: string[],
  label: string
): string {
  if (fill.type === 'GRADIENT_LINEAR') {
    const { x1, y1, x2, y2 } = svgLinearGradientEndpoints(fill, w, h);
    let defs = `<linearGradient id="grad-${layerKey}" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</linearGradient>`;
    return defs;
  }
  if (fill.type === 'GRADIENT_RADIAL') {
    const ra = svgRadialGradientAttrs(fill);
    const gt = ra.gradientTransform ? ` gradientTransform="${ra.gradientTransform}"` : '';
    let defs = `<radialGradient id="grad-${layerKey}" gradientUnits="objectBoundingBox" cx="${ra.cx}" cy="${ra.cy}" r="${ra.r}"${gt}>`;
    for (const s of fill.gradientStops) {
      defs += `<stop offset="${String(s.position)}" stop-color="${escapeAttr(rgbaFromRgba(s.color))}"/>`;
    }
    defs += `</radialGradient>`;
    return defs;
  }
  if (fill.type === 'IMAGE') {
    const url = imgMap[fill.imageHash];
    if (!url) {
      warnings.push(`missing_image_data_url:${label}:${fill.imageHash}`);
      return '';
    }
    const par = imagePatternPreserveAspectRatio(fill.scaleMode);
    return `<pattern id="img-${layerKey}" patternUnits="userSpaceOnUse" width="${String(w)}" height="${String(h)}"><image href="${escapeAttr(url)}" width="${String(w)}" height="${String(h)}" preserveAspectRatio="${par}"/></pattern>`;
  }
  return '';
}

function svgPathFillAttr(fill: Paint, layerKey: string): string {
  if (fill.type === 'SOLID') {
    return `fill="${escapeAttr(rgbaFromSolid(fill))}"`;
  }
  if (fill.type === 'GRADIENT_LINEAR' || fill.type === 'GRADIENT_RADIAL') {
    return `fill="url(#grad-${layerKey})"`;
  }
  if (fill.type === 'IMAGE') {
    return `fill="url(#img-${layerKey})"`;
  }
  return 'fill="transparent"';
}

export interface SvgStackedFillPathsResult {
  defs: string;
  /** Path elements without stroke; apply stroke to the last path only. */
  pathsHtml: string;
}

/**
 * Stack multiple Figma fills on one SVG path (bottom fill first, top fill last).
 */
export function buildSvgStackedFillPaths(
  pathD: string,
  fills: Paint[] | undefined,
  nodeId: string,
  w: number,
  h: number,
  imgMap: Record<string, string>,
  warnings: string[],
  label: string,
  _env: FileEnvelope
): SvgStackedFillPathsResult {
  const visible = (fills ?? []).filter((f) => f.visible !== false);
  const d = escapeAttr(pathD);
  if (visible.length === 0) {
    return { defs: '', pathsHtml: `<path d="${d}" fill="transparent"/>` };
  }

  const paintLayers = visible.filter((f) => f.type !== 'PATTERN');
  if (paintLayers.length === 0) {
    return { defs: '', pathsHtml: `<path d="${d}" fill="transparent"/>` };
  }

  let defs = '';
  const paths: string[] = [];
  for (let i = 0; i < paintLayers.length; i++) {
    const fill = paintLayers[i]!;
    const layerKey = paintLayers.length === 1 ? nodeId : `${nodeId}-f${String(i)}`;
    defs += appendSvgFillDefs(fill, layerKey, w, h, imgMap, warnings, `${label}:${String(i)}`);
    paths.push(`<path d="${d}" ${svgPathFillAttr(fill, layerKey)}/>`);
  }
  return { defs, pathsHtml: paths.join('') };
}
