/** Figma EllipseNode.arcData — angles in radians, clockwise from +x. */
export type EllipseArcData = {
  startingAngle: number;
  endingAngle: number;
  innerRadius: number;
};

const TAU = Math.PI * 2;

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

function pt(cx: number, cy: number, rx: number, ry: number, ang: number): string {
  return `${String(round3(cx + rx * Math.cos(ang)))},${String(round3(cy + ry * Math.sin(ang)))}`;
}

/** Clockwise sweep from start to end in [0, 2π). */
export function normalizeClockwiseSweep(start: number, end: number): number {
  let d = end - start;
  while (d < 0) d += TAU;
  while (d > TAU) d -= TAU;
  return d;
}

function isCompleteSweep(sweep: number): boolean {
  return sweep < 1e-6 || Math.abs(sweep - TAU) < 1e-6;
}

/** Full ellipse as two clockwise semicircular arcs (matches boolean operand paths). */
export function fullEllipsePathD(w: number, h: number): string {
  const w2 = w / 2;
  const h2 = h / 2;
  return `M${String(round3(w2))},0 A${String(round3(w2))},${String(round3(h2))} 0 1,1 ${String(round3(w2))},${String(h)} A${String(round3(w2))},${String(round3(h2))} 0 1,1 ${String(round3(w2))},0 Z`;
}

/** True when arcData describes a filled oval (no hole, full sweep). */
export function isPlainFullEllipse(arc: EllipseArcData | undefined): boolean {
  if (!arc) return true;
  const sweep = normalizeClockwiseSweep(arc.startingAngle, arc.endingAngle);
  return arc.innerRadius === 0 && isCompleteSweep(sweep);
}

function segmentCountForSweep(sweep: number): number {
  return Math.max(8, Math.ceil((sweep / TAU) * 64));
}

/**
 * Sample an elliptical arc in center parameterization (Figma angles, clockwise).
 * SVG endpoint arcs can resolve to a non-concentric center for the inner edge; sampling avoids that.
 */
function ellipticalArcPolylineD(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  reverse = false
): string {
  const sweep = normalizeClockwiseSweep(a0, a1);
  const n = segmentCountForSweep(sweep);
  const parts: string[] = [];
  if (!reverse) {
    for (let i = 0; i <= n; i++) {
      const ang = a0 + (sweep * i) / n;
      parts.push(pt(cx, cy, rx, ry, ang));
    }
  } else {
    for (let i = n; i >= 0; i--) {
      const ang = a0 + (sweep * i) / n;
      parts.push(pt(cx, cy, rx, ry, ang));
    }
  }
  return parts.join(' L');
}

/** SVG path for ellipse with Figma arcData (pie, arc, or donut). */
export function ellipseArcPathD(w: number, h: number, arc: EllipseArcData): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const { startingAngle: a0, endingAngle: a1, innerRadius: ir } = arc;
  const sweep = normalizeClockwiseSweep(a0, a1);

  if (isCompleteSweep(sweep) && ir === 0) {
    return fullEllipsePathD(w, h);
  }

  const outer = ellipticalArcPolylineD(cx, cy, rx, ry, a0, a1, false);

  if (isCompleteSweep(sweep) && ir > 0) {
    const irx = rx * ir;
    const iry = ry * ir;
    const inner = ellipticalArcPolylineD(cx, cy, irx, iry, a0, a1, true);
    return `M${outer} L${inner} Z`;
  }

  if (ir === 0) {
    return `M${outer} L${String(round3(cx))},${String(round3(cy))} Z`;
  }

  const irx = rx * ir;
  const iry = ry * ir;
  const inner = ellipticalArcPolylineD(cx, cy, irx, iry, a0, a1, true);
  return `M${outer} L${inner} Z`;
}

/** Path for any ellipse; uses arcData when present. */
export function ellipsePathD(w: number, h: number, arc?: EllipseArcData): string {
  if (!arc || isPlainFullEllipse(arc)) {
    return fullEllipsePathD(w, h);
  }
  return ellipseArcPathD(w, h, arc);
}
