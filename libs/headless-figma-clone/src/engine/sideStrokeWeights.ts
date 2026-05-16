import type { IndividualStrokeWeights } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

const SIDE_PATCH_KEYS = [
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
] as const;

type SidePatchKey = (typeof SIDE_PATCH_KEYS)[number];

const PATCH_TO_SIDE: Record<SidePatchKey, keyof IndividualStrokeWeights> = {
  strokeTopWeight: 'top',
  strokeRightWeight: 'right',
  strokeBottomWeight: 'bottom',
  strokeLeftWeight: 'left',
};

export interface SideStrokeWeightTarget {
  strokeWeight?: number;
  individualStrokeWeights?: Partial<IndividualStrokeWeights>;
}

export function applySideStrokeWeightPatch(
  target: SideStrokeWeightTarget,
  patch: Record<string, unknown>
): void {
  const base = target.strokeWeight ?? 0;
  const cur = target.individualStrokeWeights;
  let next: IndividualStrokeWeights | null = null;
  for (const key of SIDE_PATCH_KEYS) {
    if (!(key in patch)) continue;
    const v = patch[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new ValidationErr('VALIDATION_ERROR', `${key} must be finite number >= 0`);
    }
    if (!next) {
      next = {
        top: cur?.top ?? base,
        right: cur?.right ?? base,
        bottom: cur?.bottom ?? base,
        left: cur?.left ?? base,
      };
    }
    next[PATCH_TO_SIDE[key]] = v;
  }
  if (next) target.individualStrokeWeights = next;
}

export function readSideStrokeWeight(
  target: SideStrokeWeightTarget,
  side: keyof IndividualStrokeWeights
): number {
  const base = target.strokeWeight ?? 0;
  return target.individualStrokeWeights?.[side] ?? base;
}

export function writeSideStrokeWeight(
  target: SideStrokeWeightTarget,
  side: keyof IndividualStrokeWeights,
  value: number
): Partial<IndividualStrokeWeights> {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'stroke side weight must be finite number >= 0');
  }
  const base = target.strokeWeight ?? 0;
  const cur = target.individualStrokeWeights;
  const next = {
    top: cur?.top ?? base,
    right: cur?.right ?? base,
    bottom: cur?.bottom ?? base,
    left: cur?.left ?? base,
    [side]: value,
  };
  target.individualStrokeWeights = next;
  return next;
}
