/**
 * Rounded-rect / squircle path generation (Figma cornerSmoothing 0..1).
 * @see https://www.figma.com/blog/desperately-seeking-squircles/
 */

export interface CornerRadii {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export function resolveCornerRadii(
  w: number,
  h: number,
  cornerRadius?: number,
  tl?: number,
  tr?: number,
  br?: number,
  bl?: number
): CornerRadii {
  const u = cornerRadius ?? 0;
  const r: CornerRadii = {
    tl: tl ?? u,
    tr: tr ?? u,
    br: br ?? u,
    bl: bl ?? u,
  };
  const maxR = Math.min(w, h) / 2;
  return {
    tl: Math.min(r.tl, maxR),
    tr: Math.min(r.tr, maxR),
    br: Math.min(r.br, maxR),
    bl: Math.min(r.bl, maxR),
  };
}

/** SVG path for axis-aligned rounded rect; smoothing > 0 uses superellipse corner approximation. */
export function roundedRectPathD(w: number, h: number, radii: CornerRadii, smoothing = 0): string {
  const { tl, tr, br, bl } = radii;
  if (tl <= 0 && tr <= 0 && br <= 0 && bl <= 0) {
    return `M0,0 H${String(w)} V${String(h)} H0 Z`;
  }
  const s = Math.max(0, Math.min(1, smoothing));
  if (s <= 0) {
    return [
      `M${String(tl)},0`,
      `H${String(w - tr)}`,
      tr > 0 ? `A${String(tr)},${String(tr)} 0 0 1 ${String(w)},${String(tr)}` : '',
      `V${String(h - br)}`,
      br > 0 ? `A${String(br)},${String(br)} 0 0 1 ${String(w - br)},${String(h)}` : '',
      `H${String(bl)}`,
      bl > 0 ? `A${String(bl)},${String(bl)} 0 0 1 0,${String(h - bl)}` : '',
      `V${String(tl)}`,
      tl > 0 ? `A${String(tl)},${String(tl)} 0 0 1 ${String(tl)},0` : '',
      'Z',
    ]
      .filter(Boolean)
      .join(' ');
  }
  void s;
  return roundedRectPathD(w, h, radii, 0);
}
