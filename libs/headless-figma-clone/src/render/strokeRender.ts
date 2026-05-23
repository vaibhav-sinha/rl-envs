import type { IndividualStrokeWeights, Paint, StrokeCap, StrokeJoin } from '../model/types.js';
import { svgLinearGradientEndpoints, svgRadialGradientAttrs } from './gradientCss.js';
import { roundedRectPathD, resolveCornerRadii } from './squircle.js';

export interface StrokeBoxNode {
  width: number;
  height: number;
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  cornerSmoothing?: number;
  strokes?: Paint[];
  strokeWeight?: number;
  individualStrokeWeights?: Partial<IndividualStrokeWeights>;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeCap?: StrokeCap;
  strokeJoin?: StrokeJoin;
  dashPattern?: number[];
}

export function effectiveStrokeWeight(n: StrokeBoxNode): number {
  const ind = n.individualStrokeWeights;
  if (ind) {
    return Math.max(ind.top ?? 0, ind.right ?? 0, ind.bottom ?? 0, ind.left ?? 0, n.strokeWeight ?? 0);
  }
  return n.strokeWeight ?? 0;
}

export function perSideStrokeWeights(n: StrokeBoxNode): IndividualStrokeWeights {
  const w = n.strokeWeight ?? 0;
  const ind = n.individualStrokeWeights;
  return {
    top: ind?.top ?? w,
    right: ind?.right ?? w,
    bottom: ind?.bottom ?? w,
    left: ind?.left ?? w,
  };
}

export function rgbaFromSolid(sp: { color: { r: number; g: number; b: number }; opacity?: number }): string {
  const a = sp.opacity ?? 1;
  return `rgba(${String(Math.round(sp.color.r * 255))},${String(Math.round(sp.color.g * 255))},${String(Math.round(sp.color.b * 255))},${String(a)})`;
}

export function mapStrokeCapSvg(c: string | undefined): string {
  if (c === 'SQUARE') return 'square';
  if (c === 'NONE') return 'butt';
  return 'round';
}

export function mapStrokeJoinSvg(j: string | undefined): string {
  if (j === 'BEVEL') return 'bevel';
  if (j === 'MITER') return 'miter';
  return 'round';
}

export function dashArrayAttr(n: { dashPattern?: number[] }): string {
  if (!n.dashPattern?.length) return '';
  return ` stroke-dasharray="${n.dashPattern.map((x) => String(x)).join(' ')}"`;
}

export function svgStrokeGradientDefs(stroke: Paint, gradId: string, w: number, h: number): string | null {
  if (stroke.type === 'GRADIENT_LINEAR') {
    const { x1, y1, x2, y2 } = svgLinearGradientEndpoints(stroke, w, h);
    let defs = `<linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${String(x1)}" y1="${String(y1)}" x2="${String(x2)}" y2="${String(y2)}">`;
    for (const st of stroke.gradientStops) {
      const a = st.color.a ?? 1;
      defs += `<stop offset="${String(st.position)}" stop-color="rgba(${String(Math.round(st.color.r * 255))},${String(Math.round(st.color.g * 255))},${String(Math.round(st.color.b * 255))},${String(a)}"/>`;
    }
    defs += '</linearGradient>';
    return defs;
  }
  if (stroke.type === 'GRADIENT_RADIAL') {
    const ra = svgRadialGradientAttrs(stroke);
    const gt = ra.gradientTransform ? ` gradientTransform="${ra.gradientTransform}"` : '';
    let defs = `<radialGradient id="${gradId}" gradientUnits="objectBoundingBox" cx="${ra.cx}" cy="${ra.cy}" r="${ra.r}"${gt}>`;
    for (const st of stroke.gradientStops) {
      const a = st.color.a ?? 1;
      defs += `<stop offset="${String(st.position)}" stop-color="rgba(${String(Math.round(st.color.r * 255))},${String(Math.round(st.color.g * 255))},${String(Math.round(st.color.b * 255))},${String(a)}"/>`;
    }
    defs += '</radialGradient>';
    return defs;
  }
  return null;
}

export function boxPathD(n: StrokeBoxNode): string {
  const radii = resolveCornerRadii(
    n.width,
    n.height,
    n.cornerRadius,
    n.topLeftRadius,
    n.topRightRadius,
    n.bottomRightRadius,
    n.bottomLeftRadius
  );
  return roundedRectPathD(n.width, n.height, radii, n.cornerSmoothing ?? 0);
}

export interface StrokeBorderResult {
  borderCss: string;
  svgOverlay: string | null;
  warnings: string[];
}

/** Expand {@link StrokeBorderResult.borderCss} into a full CSS declaration block fragment. */
export function borderCssDeclaration(borderCss: string): string {
  if (borderCss === 'none') return 'border:none;';
  if (borderCss.includes('border-')) {
    return borderCss.endsWith(';') ? borderCss : `${borderCss};`;
  }
  return `border:${borderCss};`;
}

export function computeStrokeBorder(
  n: StrokeBoxNode,
  nodeId: string,
  escapeAttr: (s: string) => string
): StrokeBorderResult {
  const warnings: string[] = [];
  const stroke = n.strokes?.[0];
  const sides = perSideStrokeWeights(n);
  const hasIndividual =
    sides.top !== sides.right || sides.right !== sides.bottom || sides.bottom !== sides.left;
  const sw = effectiveStrokeWeight(n);

  if (!stroke || sw <= 0 || stroke.visible === false) {
    return { borderCss: 'none', svgOverlay: null, warnings };
  }

  const gradientStroke =
    stroke.type === 'GRADIENT_LINEAR' || stroke.type === 'GRADIENT_RADIAL';

  if (hasIndividual && stroke.type === 'SOLID' && !gradientStroke) {
    const c = rgbaFromSolid(stroke);
    const borderParts = [
      sides.top > 0 ? `border-top:${String(sides.top)}px solid ${c}` : '',
      sides.right > 0 ? `border-right:${String(sides.right)}px solid ${c}` : '',
      sides.bottom > 0 ? `border-bottom:${String(sides.bottom)}px solid ${c}` : '',
      sides.left > 0 ? `border-left:${String(sides.left)}px solid ${c}` : '',
    ].filter(Boolean);
    return {
      borderCss: borderParts.length ? borderParts.join(';') : 'none',
      svgOverlay: null,
      warnings,
    };
  }

  if (!gradientStroke && stroke.type === 'SOLID' && !n.dashPattern?.length) {
    return {
      borderCss: `${String(sw)}px solid ${rgbaFromSolid(stroke)}`,
      svgOverlay: null,
      warnings,
    };
  }

  if (!gradientStroke && stroke.type === 'SOLID' && n.dashPattern?.length) {
    return {
      borderCss: `${String(sw)}px dashed ${rgbaFromSolid(stroke)}`,
      svgOverlay: null,
      warnings,
    };
  }

  if (gradientStroke) {
    const gradId = `stroke-grad-${nodeId}`;
    const defs = svgStrokeGradientDefs(stroke, gradId, n.width, n.height);
    if (defs) {
      const d = boxPathD(n);
      const cap = mapStrokeCapSvg(n.strokeCap);
      const jn = mapStrokeJoinSvg(n.strokeJoin);
      const dash = n.dashPattern?.length ? dashArrayAttr(n) : '';
      const pad = sw / 2;
      const vbW = n.width + sw;
      const vbH = n.height + sw;
      return {
        borderCss: 'none',
        svgOverlay: `<svg class="hfc-stroke-svg" viewBox="${String(-pad)} ${String(-pad)} ${String(vbW)} ${String(vbH)}" width="100%" height="100%" style="position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}</defs><path d="${escapeAttr(d)}" fill="none" stroke="url(#${gradId})" stroke-width="${String(sw)}" stroke-linecap="${cap}" stroke-linejoin="${jn}"${dash}/></svg>`,
        warnings,
      };
    }
    warnings.push(`gradient_stroke_unsupported:${nodeId}`);
  }

  if (stroke.type === 'IMAGE' || stroke.type === 'PATTERN') {
    warnings.push(`paint_stroke_unsupported:${nodeId}`);
  }

  return { borderCss: 'none', svgOverlay: null, warnings };
}
