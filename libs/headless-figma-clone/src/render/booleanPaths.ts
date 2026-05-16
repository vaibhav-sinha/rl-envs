import {
  arcSegmentToCubics,
  FillRule,
  PathBooleanOperation,
  pathBoolean,
  pathFromPathData,
  pathToPathData,
} from 'path-bool';
import type {
  BooleanOperandNode,
  BooleanOperationNode,
  Paint,
  RectangleNode,
  VectorPathData,
} from '../model/types.js';
import { DEFAULT_SHAPE_FILLS } from '../model/types.js';
import { ellipsePathD, isPlainFullEllipse } from './shapePaths.js';

type BoolPath = ReturnType<typeof pathFromPathData>;
type Vector = [number, number];
type PathSegment = BoolPath[number];

type BooleanOp = BooleanOperationNode['booleanOperation'];

function shiftVector(v: Vector, tx: number, ty: number): Vector {
  return [v[0] + tx, v[1] + ty];
}

function rotateVector(v: Vector, cx: number, cy: number, cos: number, sin: number): Vector {
  const dx = v[0] - cx;
  const dy = v[1] - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
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

function rotatePathSegment(seg: PathSegment, cx: number, cy: number, cos: number, sin: number): PathSegment {
  switch (seg[0]) {
    case 'L':
      return ['L', rotateVector(seg[1], cx, cy, cos, sin), rotateVector(seg[2], cx, cy, cos, sin)];
    case 'C':
      return [
        'C',
        rotateVector(seg[1], cx, cy, cos, sin),
        rotateVector(seg[2], cx, cy, cos, sin),
        rotateVector(seg[3], cx, cy, cos, sin),
        rotateVector(seg[4], cx, cy, cos, sin),
      ];
    case 'Q':
      return [
        'Q',
        rotateVector(seg[1], cx, cy, cos, sin),
        rotateVector(seg[2], cx, cy, cos, sin),
        rotateVector(seg[3], cx, cy, cos, sin),
      ];
    case 'A': {
      const cubics = arcSegmentToCubics(seg);
      const flat = (Array.isArray(cubics[0]) ? cubics : [cubics]) as PathSegment[];
      const rotated = flat.map((s) => rotatePathSegment(s, cx, cy, cos, sin));
      return rotated[0] ?? seg;
    }
    default:
      return seg;
  }
}

function expandSegment(seg: PathSegment): PathSegment[] {
  if (seg[0] === 'A') {
    const cubics = arcSegmentToCubics(seg);
    return (Array.isArray(cubics[0]) ? cubics : [cubics]) as PathSegment[];
  }
  return [seg];
}

function translatePath(path: BoolPath, tx: number, ty: number): BoolPath {
  if (tx === 0 && ty === 0) return path;
  return path.map((seg: PathSegment) => translatePathSegment(seg, tx, ty));
}

function rotatePath(path: BoolPath, cx: number, cy: number, degrees: number): BoolPath {
  if (degrees === 0) return path;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const out: BoolPath = [];
  for (const seg of path) {
    for (const expanded of expandSegment(seg)) {
      out.push(rotatePathSegment(expanded, cx, cy, cos, sin));
    }
  }
  return out;
}

export function rectCornerRadii(r: RectangleNode): [number, number, number, number] {
  const uniform = r.cornerRadius ?? 0;
  return [
    r.topLeftRadius ?? uniform,
    r.topRightRadius ?? uniform,
    r.bottomRightRadius ?? uniform,
    r.bottomLeftRadius ?? uniform,
  ];
}

/** Figma rounds corners by clamping each radius to half the shorter side (same as vector rect paths). */
export function clampRectCornerRadiiToBox(
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number
): [number, number, number, number] {
  const clamp = (rad: number) => Math.max(0, Math.min(rad, w / 2, h / 2));
  return [clamp(tl), clamp(tr), clamp(br), clamp(bl)];
}

function polygonPointsD(n: number, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
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

function rectPathD(r: RectangleNode): string {
  const w = r.width;
  const h = r.height;
  const [tl0, tr0, br0, bl0] = rectCornerRadii(r);
  const [tl, tr, br, bl] = clampRectCornerRadiiToBox(w, h, tl0, tr0, br0, bl0);
  if (tl === 0 && tr === 0 && br === 0 && bl === 0) return `M0,0 H${String(w)} V${String(h)} H0 Z`;
  if (tl === tr && tr === br && br === bl) {
    const rad = tl;
    return [
      `M${String(rad)},0`,
      `H${String(w - rad)}`,
      `A${String(rad)},${String(rad)} 0 0 1 ${String(w)},${String(rad)}`,
      `V${String(h - rad)}`,
      `A${String(rad)},${String(rad)} 0 0 1 ${String(w - rad)},${String(h)}`,
      `H${String(rad)}`,
      `A${String(rad)},${String(rad)} 0 0 1 0,${String(h - rad)}`,
      `V${String(rad)}`,
      `A${String(rad)},${String(rad)} 0 0 1 ${String(rad)},0`,
      'Z',
    ].join(' ');
  }
  return [
    `M${String(tl)},0`,
    `H${String(w - tr)}`,
    `A${String(tr)},${String(tr)} 0 0 1 ${String(w)},${String(tr)}`,
    `V${String(h - br)}`,
    `A${String(br)},${String(br)} 0 0 1 ${String(w - br)},${String(h)}`,
    `H${String(bl)}`,
    `A${String(bl)},${String(bl)} 0 0 1 0,${String(h - bl)}`,
    `V${String(tl)}`,
    `A${String(tl)},${String(tl)} 0 0 1 ${String(tl)},0`,
    'Z',
  ].join(' ');
}

function vectorFillRule(vp: VectorPathData): FillRule {
  return vp.windingRule === 'EVENODD' ? FillRule.EvenOdd : FillRule.NonZero;
}

function mergeUnionPaths(paths: BoolPath[]): BoolPath {
  let acc = paths[0]!;
  for (let i = 1; i < paths.length; i++) {
    const merged = pathBoolean(acc, FillRule.NonZero, paths[i]!, FillRule.NonZero, PathBooleanOperation.Union);
    acc = merged[0] ?? acc;
  }
  return acc;
}

function unionPathDataInLocalSpace(parts: VectorPathData[]): string {
  if (parts.length === 0) return 'M0,0';
  if (parts.length === 1) return parts[0]!.data;
  let acc = pathFromPathData(parts[0]!.data);
  let accRule = vectorFillRule(parts[0]!);
  for (let i = 1; i < parts.length; i++) {
    const p = pathFromPathData(parts[i]!.data);
    const merged = pathBoolean(acc, accRule, p, vectorFillRule(parts[i]!), PathBooleanOperation.Union);
    if (merged.length === 0) continue;
    acc = merged.length === 1 ? merged[0]! : mergeUnionPaths(merged);
    accRule = FillRule.NonZero;
  }
  return pathToPathData(acc);
}

/** Full-ellipse polygon for INTERSECT only — path-bool can fail to intersect arc ellipses with rects reliably. */
const ELLIPSE_INTERSECT_POLYGON_SEGMENTS = 72;

function booleanOperandPathDForIntersect(op: BooleanOperandNode): string {
  if (op.type === 'RECTANGLE') return rectPathD(op);
  if (op.type === 'VECTOR') {
    const paths = op.vectorPaths ?? [];
    return unionPathDataInLocalSpace(paths);
  }
  if (op.type === 'POLYGON') return polygonPointsD(op.pointCount, op.width, op.height);
  if (op.type === 'STAR') return starPathD(op.pointCount, op.innerRadius, op.width, op.height);
  if (op.type === 'ELLIPSE') {
    if (isPlainFullEllipse(op.arcData)) {
      return polygonPointsD(ELLIPSE_INTERSECT_POLYGON_SEGMENTS, op.width, op.height);
    }
    return ellipsePathD(op.width, op.height, op.arcData);
  }
  return 'M0,0';
}

export function booleanOperandPathD(op: BooleanOperandNode): string {
  if (op.type === 'RECTANGLE') return rectPathD(op);
  if (op.type === 'VECTOR') {
    const paths = op.vectorPaths ?? [];
    return unionPathDataInLocalSpace(paths);
  }
  if (op.type === 'POLYGON') return polygonPointsD(op.pointCount, op.width, op.height);
  if (op.type === 'STAR') return starPathD(op.pointCount, op.innerRadius, op.width, op.height);
  if (op.type === 'ELLIPSE') {
    return ellipsePathD(op.width, op.height, op.arcData);
  }
  return 'M0,0';
}

function operandPathInBooleanSpace(op: BooleanOperandNode, intersectMode: boolean): BoolPath {
  const d = intersectMode ? booleanOperandPathDForIntersect(op) : booleanOperandPathD(op);
  let path = pathFromPathData(d);
  path = translatePath(path, op.x, op.y);
  const rot = op.rotation ?? 0;
  if (rot !== 0) {
    path = rotatePath(path, op.x, op.y, rot);
  }
  return path;
}

function foldUnion(paths: BoolPath[]): BoolPath[] {
  if (paths.length === 0) return [];
  let acc = paths[0]!;
  for (let i = 1; i < paths.length; i++) {
    const merged = pathBoolean(acc, FillRule.NonZero, paths[i]!, FillRule.NonZero, PathBooleanOperation.Union);
    if (merged.length === 0) return [];
    acc = merged.length === 1 ? merged[0]! : mergeUnionPaths(merged);
  }
  return [acc];
}

function foldDifference(paths: BoolPath[]): BoolPath[] {
  if (paths.length === 0) return [];
  let acc: BoolPath[] = [paths[0]!];
  for (let i = 1; i < paths.length; i++) {
    const subtrahend = paths[i]!;
    const next: BoolPath[] = [];
    for (const a of acc) {
      next.push(
        ...pathBoolean(a, FillRule.NonZero, subtrahend, FillRule.NonZero, PathBooleanOperation.Difference)
      );
    }
    acc = next;
  }
  return acc;
}

function foldIntersection(paths: BoolPath[]): BoolPath[] {
  if (paths.length === 0) return [];
  let acc: BoolPath[] = [paths[0]!];
  for (let i = 1; i < paths.length; i++) {
    const other = paths[i]!;
    const next: BoolPath[] = [];
    for (const a of acc) {
      next.push(
        ...pathBoolean(a, FillRule.NonZero, other, FillRule.NonZero, PathBooleanOperation.Intersection)
      );
    }
    acc = next;
    if (acc.length === 0) break;
  }
  return acc;
}

function foldExclusion(paths: BoolPath[]): BoolPath[] {
  if (paths.length === 0) return [];
  let acc = paths[0]!;
  for (let i = 1; i < paths.length; i++) {
    const merged = pathBoolean(acc, FillRule.NonZero, paths[i]!, FillRule.NonZero, PathBooleanOperation.Exclusion);
    if (merged.length === 0) return [];
    acc = merged.length === 1 ? merged[0]! : mergeUnionPaths(merged);
  }
  return [acc];
}

function foldBooleanPaths(paths: BoolPath[], op: BooleanOp): BoolPath[] {
  if (paths.length < 2) return paths;
  switch (op) {
    case 'UNION':
      return foldUnion(paths);
    case 'SUBTRACT':
      return foldDifference(paths);
    case 'INTERSECT':
      return foldIntersection(paths);
    case 'EXCLUDE':
      return foldExclusion(paths);
  }
}

/** Solid fill used when a boolean node has no explicit fills (Figma default #D9D9D9). */
export function resolveBooleanDisplayFill(node: BooleanOperationNode): Paint {
  const direct = node.fills?.[0];
  if (direct && direct.type === 'SOLID' && (direct.visible === undefined || direct.visible)) {
    return direct;
  }
  return DEFAULT_SHAPE_FILLS[0]!;
}

export interface BooleanPathResult {
  pathData: string[];
  failed: boolean;
}

/** Compute SVG path `d` strings for a boolean operation node (boolean-local coordinates). */
export function computeBooleanPathData(node: BooleanOperationNode): BooleanPathResult {
  const children = node.children;
  if (children.length < 2) {
    return { pathData: children.map((ch) => booleanOperandPathD(ch)), failed: false };
  }
  try {
    const operands = children.map((ch) => operandPathInBooleanSpace(ch, node.booleanOperation === 'INTERSECT'));
    const result = foldBooleanPaths(operands, node.booleanOperation);
    if (result.length === 0) return { pathData: [], failed: false };
    const pathData = result.map((p) => pathToPathData(p)).filter((d) => d.length > 0);
    if (pathData.length === 0) return { pathData: [], failed: false };
    return { pathData, failed: false };
  } catch {
    return { pathData: [], failed: true };
  }
}
