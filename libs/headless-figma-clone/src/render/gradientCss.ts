import type { GradientPaint } from '../model/types.js';

type Transform2x3 = GradientPaint['gradientTransform'];
type Point = [number, number];

/** Invert a Figma affine `gradientTransform` (2×3 top rows of a 3×3 matrix). */
export function invertGradientTransform(t: Transform2x3): number[][] {
  const m00 = t[0][0];
  const m01 = t[0][1];
  const m02 = t[0][2];
  const m10 = t[1][0];
  const m11 = t[1][1];
  const m12 = t[1][2];
  const det = m00 * m11 - m01 * m10;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-10) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }
  const inv00 = m11 / det;
  const inv01 = -m01 / det;
  const inv10 = -m10 / det;
  const inv11 = m00 / det;
  const inv02 = -(inv00 * m02 + inv01 * m12);
  const inv12 = -(inv10 * m02 + inv11 * m12);
  return [
    [inv00, inv01, inv02],
    [inv10, inv11, inv12],
    [0, 0, 1],
  ];
}

function applyMatrixToPoint(m: number[][], p: Point): Point {
  return [
    p[0] * m[0][0]! + p[1] * m[0][1]! + m[0][2]!,
    p[0] * m[1][0]! + p[1] * m[1][1]! + m[1][2]!,
  ];
}

function pct(n: number): string {
  const v = Math.round(n * 1000) / 10;
  return `${String(v)}%`;
}

function gradientStopList(g: GradientPaint): string {
  const stops = [...g.gradientStops].sort((a, b) => a.position - b.position);
  return stops
    .map((s) => {
      const a = s.color.a ?? 1;
      const r = Math.round(s.color.r * 255);
      const gch = Math.round(s.color.g * 255);
      const b = Math.round(s.color.b * 255);
      return `rgba(${String(r)},${String(gch)},${String(b)},${String(a)}) ${String(Math.round(s.position * 100))}%`;
    })
    .join(',');
}

/** CSS `linear-gradient` angle + stops from Figma `gradientTransform`. */
export function linearGradientCss(g: GradientPaint): string {
  const inv = invertGradientTransform(g.gradientTransform);
  const start = applyMatrixToPoint(inv, [0, 0.5]);
  const end = applyMatrixToPoint(inv, [1, 0.5]);
  const deg =
    (Math.atan2(end[0] - start[0], -(end[1] - start[1])) * 180) / Math.PI;
  return `linear-gradient(${String(Math.round(deg * 100) / 100)}deg,${gradientStopList(g)})`;
}

/** CSS elliptical `radial-gradient` from Figma `gradientTransform` (figma-plugin-helpers algorithm). */
export function radialGradientCss(g: GradientPaint): string {
  const inv = invertGradientTransform(g.gradientTransform);
  const center = applyMatrixToPoint(inv, [0.5, 0.5]);
  const rxPoint = applyMatrixToPoint(inv, [1, 0.5]);
  const ryPoint = applyMatrixToPoint(inv, [0.5, 1]);
  const rx = Math.hypot(rxPoint[0] - center[0], rxPoint[1] - center[1]);
  const ry = Math.hypot(ryPoint[0] - center[0], ryPoint[1] - center[1]);
  return `radial-gradient(${pct(rx)} ${pct(ry)} at ${pct(center[0])} ${pct(center[1])},${gradientStopList(g)})`;
}

export function svgLinearGradientEndpoints(
  g: GradientPaint,
  width: number,
  height: number
): { x1: number; y1: number; x2: number; y2: number } {
  const inv = invertGradientTransform(g.gradientTransform);
  const start = applyMatrixToPoint(inv, [0, 0.5]);
  const end = applyMatrixToPoint(inv, [1, 0.5]);
  return {
    x1: start[0] * width,
    y1: start[1] * height,
    x2: end[0] * width,
    y2: end[1] * height,
  };
}

export function svgRadialGradientAttrs(g: GradientPaint): {
  cx: string;
  cy: string;
  r: string;
  gradientTransform: string;
} {
  const inv = invertGradientTransform(g.gradientTransform);
  const center = applyMatrixToPoint(inv, [0.5, 0.5]);
  const rxPoint = applyMatrixToPoint(inv, [1, 0.5]);
  const ryPoint = applyMatrixToPoint(inv, [0.5, 1]);
  const rx = Math.hypot(rxPoint[0] - center[0], rxPoint[1] - center[1]);
  const ry = Math.hypot(ryPoint[0] - center[0], ryPoint[1] - center[1]);
  const r = Math.max(rx, ry);
  return {
    cx: String(center[0]),
    cy: String(center[1]),
    r: String(r),
    gradientTransform: r > 1e-6 && Math.abs(rx - ry) > 1e-4 ? `matrix(${String(rx / r)} 0 0 ${String(ry / r)} 0 0)` : '',
  };
}
