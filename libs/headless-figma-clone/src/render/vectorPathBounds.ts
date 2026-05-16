import { pathFromPathData, pathSegmentBoundingBox, pathToPathData } from 'path-bool';

type PathSegment = ReturnType<typeof pathFromPathData>[number];
type Vector = [number, number];

function shiftVector(v: Vector, tx: number, ty: number): Vector {
  return [v[0] + tx, v[1] + ty];
}

function translatePathSegment(seg: PathSegment, tx: number, ty: number): PathSegment {
  switch (seg[0]) {
    case 'L':
      return ['L', shiftVector(seg[1], tx, ty), shiftVector(seg[2], tx, ty)];
    case 'C':
      return [
        'C',
        shiftVector(seg[1], tx, ty),
        shiftVector(seg[2], tx, ty),
        shiftVector(seg[3], tx, ty),
        shiftVector(seg[4], tx, ty),
      ];
    case 'Q':
      return [
        'Q',
        shiftVector(seg[1], tx, ty),
        shiftVector(seg[2], tx, ty),
        shiftVector(seg[3], tx, ty),
      ];
    case 'A':
      return [
        'A',
        shiftVector(seg[1], tx, ty),
        seg[2],
        seg[3],
        seg[4],
        seg[5],
        seg[6],
        shiftVector(seg[7], tx, ty),
      ];
    default:
      return seg;
  }
}

/** Translate SVG path `d` by `(tx, ty)`. */
export function translatePathData(data: string, tx: number, ty: number): string {
  if (tx === 0 && ty === 0) return data;
  const segments = pathFromPathData(data).map((seg: PathSegment) => translatePathSegment(seg, tx, ty));
  return pathToPathData(segments);
}

export interface PathDataBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function mergeAabb(a: PathDataBounds | null, b: PathDataBounds): PathDataBounds {
  if (!a) return b;
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function segmentBounds(seg: ReturnType<typeof pathFromPathData>[number]): PathDataBounds {
  const box = pathSegmentBoundingBox(seg);
  return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
}

/** Axis-aligned bounds of SVG path `d` in the path's local coordinate space. */
export function boundingBoxFromPathData(data: string): PathDataBounds {
  let merged: PathDataBounds | null = null;
  for (const seg of pathFromPathData(data)) {
    merged = mergeAabb(merged, segmentBounds(seg));
  }
  if (!merged) return { left: 0, top: 0, right: 1, bottom: 1 };
  return merged;
}

/** Tight axis-aligned size of path geometry in `data`. */
export function tightSizeFromPathData(data: string): { width: number; height: number } {
  const b = boundingBoxFromPathData(data);
  return {
    width: Math.max(1, b.right - b.left),
    height: Math.max(1, b.bottom - b.top),
  };
}

/** Expand a shape box so it contains all geometry in `data` (Figma vector sizing parity). */
export function fitShapeBoxToPathData(
  box: { width: number; height: number },
  data: string
): { width: number; height: number } {
  const tight = tightSizeFromPathData(data);
  return {
    width: Math.max(box.width, tight.width),
    height: Math.max(box.height, tight.height),
  };
}

/** Origin offset of path geometry within a node's local space. */
export function pathDataOffset(data: string): { x: number; y: number } {
  const b = boundingBoxFromPathData(data);
  return { x: b.left, y: b.top };
}

/** Shift path geometry to node-local origin; returns normalized `d` and tight size. */
export function normalizePathDataToOrigin(data: string): {
  data: string;
  width: number;
  height: number;
} {
  const b = boundingBoxFromPathData(data);
  const width = Math.max(1, b.right - b.left);
  const height = Math.max(1, b.bottom - b.top);
  if (b.left === 0 && b.top === 0) {
    return { data, width, height };
  }
  return {
    data: translatePathData(data, -b.left, -b.top),
    width,
    height,
  };
}

/** viewBox + pixel size for SVG (1:1 mapping, no stretch). */
export function svgViewportForPathData(
  data: string
): { viewBox: string; width: number; height: number } {
  const { data: normalized, width, height } = normalizePathDataToOrigin(data);
  void normalized;
  return {
    viewBox: `0 0 ${String(width)} ${String(height)}`,
    width,
    height,
  };
}

/** Union bounds of multiple subpaths in a single VECTOR node (e.g. "9:41" glyph outlines). */
export function boundingBoxFromVectorPaths(paths: { data: string }[]): PathDataBounds | null {
  let merged: PathDataBounds | null = null;
  for (const p of paths) {
    if (!p.data) continue;
    merged = mergeAabb(merged, boundingBoxFromPathData(p.data));
  }
  return merged;
}

/** viewBox + pixel size spanning all subpaths without translating path coordinates. */
export function svgViewportForVectorPaths(
  paths: { data: string }[]
): { viewBox: string; width: number; height: number } | null {
  const merged = boundingBoxFromVectorPaths(paths);
  if (!merged) return null;
  const width = Math.max(1, merged.right - merged.left);
  const height = Math.max(1, merged.bottom - merged.top);
  return {
    viewBox: `${String(merged.left)} ${String(merged.top)} ${String(width)} ${String(height)}`,
    width,
    height,
  };
}
