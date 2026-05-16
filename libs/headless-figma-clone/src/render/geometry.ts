import type { FrameNode, RectangleNode, VectorNode, VectorPathData } from '../model/types.js';
import { boxPathD, effectiveStrokeWeight, perSideStrokeWeights } from './strokeRender.js';
import { roundedRectPathD, resolveCornerRadii } from './squircle.js';

export type GeometryNode = RectangleNode | FrameNode;

export function computeFillGeometry(n: GeometryNode): VectorPathData[] {
  const radii = resolveCornerRadii(
    n.width,
    n.height,
    n.cornerRadius,
    n.topLeftRadius,
    n.topRightRadius,
    n.bottomRightRadius,
    n.bottomLeftRadius
  );
  const d = roundedRectPathD(n.width, n.height, radii, n.cornerSmoothing ?? 0);
  return [{ windingRule: 'NONZERO', data: d }];
}

export function computeStrokeGeometry(n: GeometryNode): VectorPathData[] {
  const sw = effectiveStrokeWeight(n);
  if (sw <= 0 || !n.strokes?.length) return [];
  const d = boxPathD(n);
  return [{ windingRule: 'NONZERO', data: d }];
}

export function outlineStrokeToVector(n: GeometryNode): VectorNode | null {
  const sw = effectiveStrokeWeight(n);
  const stroke = n.strokes?.[0];
  if (!stroke || sw <= 0 || stroke.visible === false) return null;
  if (stroke.type !== 'SOLID') return null;
  const sides = perSideStrokeWeights(n);
  const w = n.width + sides.left + sides.right;
  const h = n.height + sides.top + sides.bottom;
  const radii = resolveCornerRadii(w, h, n.cornerRadius, n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius);
  const d = roundedRectPathD(w, h, radii, n.cornerSmoothing ?? 0);
  return {
    id: `outline-${n.id}`,
    type: 'VECTOR',
    name: `${n.name} (outline)`,
    x: n.x - sides.left,
    y: n.y - sides.top,
    width: w,
    height: h,
    vectorPaths: [{ windingRule: 'NONZERO', data: d }],
    fills: [stroke],
  };
}
