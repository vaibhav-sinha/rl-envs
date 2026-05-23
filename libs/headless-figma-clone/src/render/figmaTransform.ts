import type { BlendMode, SceneNode } from '../model/types.js';

/** Figma Plugin API 2×3 affine transform (relativeTransform). */
export type FigmaTransform = [[number, number, number], [number, number, number]];

export interface TransformableNode {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  relativeTransform?: FigmaTransform;
}

export interface NodeTransformCssOptions {
  skipRotation?: boolean;
  /** Sum of rotation from rotated auto-layout frame ancestors (flex children only). */
  inheritedAutoLayoutRotationDeg?: number;
  insideFlex?: boolean;
}

/** Build relativeTransform from stored matrix or decomposed x/y + rotation. */
export function buildRelativeTransform(node: TransformableNode): FigmaTransform {
  if (node.relativeTransform) {
    return node.relativeTransform;
  }
  const deg = node.rotation ?? 0;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    [cos, sin, node.x],
    [-sin, cos, node.y],
  ];
}

/** Rotate a point with Figma's relativeTransform matrix (positive deg = CCW in y-down space). */
export function rotatePointFigma(
  cx: number,
  cy: number,
  px: number,
  py: number,
  deg: number
): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos + dy * sin, y: cy - dx * sin + dy * cos };
}

export function transformedAxisAlignedBounds(
  width: number,
  height: number,
  rotationDeg: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const corners = [
    { px: 0, py: 0 },
    { px: width, py: 0 },
    { px: width, py: height },
    { px: 0, py: height },
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    const r = rotatePointFigma(0, 0, c.px, c.py, rotationDeg);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x);
    maxY = Math.max(maxY, r.y);
  }
  return { minX, minY, maxX, maxY };
}

/** Round matrix coefficients for stable CSS output. */
function fmtMatrix(n: number): string {
  const rounded = Math.abs(n) < 1e-10 ? 0 : Math.round(n * 1e6) / 1e6;
  return String(rounded);
}

/**
 * CSS matrix() for Figma rotation around the node top-left (Plugin API pivot).
 * Matches `rotate(-rotation)deg` with `transform-origin: top left`.
 */
export function figmaTopLeftRotationMatrixCss(rotationDeg: number): string {
  const rad = (-rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return `matrix(${fmtMatrix(cos)},${fmtMatrix(sin)},${fmtMatrix(-sin)},${fmtMatrix(cos)},0,0)`;
}

/** Full Figma relativeTransform as CSS matrix (translation included). */
export function figmaRelativeTransformMatrixCss(t: FigmaTransform): string {
  const [[m00, m01, m02], [m10, m11, m12]] = t;
  // CSS matrix(a,b,c,d,e,f) ↔ x' = a*px + c*py + e; Figma x' = m00*px + m01*py + m02
  return `matrix(${String(m00)},${String(m10)},${String(m01)},${String(m11)},${String(m02)},${String(m12)})`;
}

function mixBlendCss(m: BlendMode | undefined): string {
  if (!m || m === 'PASS_THROUGH' || m === 'NORMAL') return '';
  const map: Partial<Record<BlendMode, string>> = {
    MULTIPLY: 'multiply',
    SCREEN: 'screen',
    OVERLAY: 'overlay',
    DARKEN: 'darken',
    LIGHTEN: 'lighten',
    COLOR_DODGE: 'color-dodge',
    COLOR_BURN: 'color-burn',
    HARD_LIGHT: 'hard-light',
    SOFT_LIGHT: 'soft-light',
    DIFFERENCE: 'difference',
    EXCLUSION: 'exclusion',
    HUE: 'hue',
    SATURATION: 'saturation',
    COLOR: 'color',
    LUMINOSITY: 'luminosity',
  };
  const v = map[m];
  return v ? `mix-blend-mode:${v};` : '';
}

/**
 * Opacity, blend mode, visibility, and rotation CSS for a scene node.
 *
 * - Absolutely positioned nodes: Figma relativeTransform rotation around top-left (matrix form).
 * - Flex children inside rotated auto-layout frames: rotate around center so layout slots stay put
 *   while icon/content direction matches Figma (children do not inherit parent transform matrix).
 */
export function nodeTransformCss(
  n: Pick<SceneNode, 'rotation' | 'opacity' | 'blendMode' | 'visible'>,
  opts?: NodeTransformCssOptions
): string {
  let s = '';
  const inherited = opts?.inheritedAutoLayoutRotationDeg ?? 0;
  const ownRot = n.rotation ?? 0;

  if (!opts?.skipRotation) {
    if (opts?.insideFlex && inherited !== 0) {
      const totalRot = ownRot + inherited;
      if (totalRot !== 0) {
        s += `transform:rotate(${String(-totalRot)}deg);transform-origin:center center;`;
      }
    } else if (ownRot !== 0) {
      s += `transform:${figmaTopLeftRotationMatrixCss(ownRot)};transform-origin:top left;`;
    }
  }

  if (n.opacity !== undefined && n.opacity !== 1) {
    s += `opacity:${String(n.opacity)};`;
  }
  if (n.visible === false) {
    s += 'display:none;';
  }
  s += mixBlendCss(n.blendMode);
  return s;
}

/** True when a frame uses auto-layout and carries non-zero rotation. */
export function isRotatedAutoLayoutFrame(node: {
  layoutMode?: string;
  rotation?: number;
}): boolean {
  const rot = node.rotation ?? 0;
  if (rot === 0) return false;
  return node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL' || node.layoutMode === 'GRID';
}
