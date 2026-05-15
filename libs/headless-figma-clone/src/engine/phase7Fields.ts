import type {
  FontName,
  LayoutConstraintHorizontal,
  LayoutConstraintVertical,
  LayoutConstraints,
  LayoutPositioning,
  LayoutSelfFields,
  LayoutSizing,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

const LAYOUT_SIZING = new Set<LayoutSizing>(['FIXED', 'HUG', 'FILL']);
const LAYOUT_POSITIONING = new Set<LayoutPositioning>(['AUTO', 'ABSOLUTE']);
const CONSTRAINT_H = new Set<LayoutConstraintHorizontal>(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);
const CONSTRAINT_V = new Set<LayoutConstraintVertical>(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validateLayoutSizing(v: unknown, label: string): LayoutSizing | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !LAYOUT_SIZING.has(v as LayoutSizing)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label} must be FIXED, HUG, or FILL`);
  }
  return v as LayoutSizing;
}

export function validateLayoutPositioning(v: unknown, label: string): LayoutPositioning | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !LAYOUT_POSITIONING.has(v as LayoutPositioning)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label} must be AUTO or ABSOLUTE`);
  }
  return v as LayoutPositioning;
}

export function validateLayoutConstraints(v: unknown, label: string): LayoutConstraints | undefined {
  if (v === undefined || v === null) return undefined;
  if (!isRecord(v)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be object`);
  const h = v.horizontal;
  const vert = v.vertical;
  if (typeof h !== 'string' || !CONSTRAINT_H.has(h as LayoutConstraintHorizontal)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}.horizontal invalid`);
  }
  if (typeof vert !== 'string' || !CONSTRAINT_V.has(vert as LayoutConstraintVertical)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}.vertical invalid`);
  }
  return { horizontal: h as LayoutConstraintHorizontal, vertical: vert as LayoutConstraintVertical };
}

export function validateFontName(v: unknown, label: string): FontName | undefined {
  if (v === undefined || v === null) return undefined;
  if (!isRecord(v)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be object`);
  if (typeof v.family !== 'string' || v.family.length === 0) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}.family required`);
  }
  if (typeof v.style !== 'string' || v.style.length === 0) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}.style required`);
  }
  return { family: v.family, style: v.style };
}

/** Apply Phase 7 layout-self patch keys onto any node carrying {@link LayoutSelfFields}. */
export function applyLayoutSelfPatch(target: LayoutSelfFields, patch: Record<string, unknown>): void {
  if ('layoutAlign' in patch) {
    const la = patch.layoutAlign;
    if (
      la !== 'MIN' &&
      la !== 'CENTER' &&
      la !== 'MAX' &&
      la !== 'STRETCH' &&
      la !== 'INHERIT'
    ) {
      throw new ValidationErr('VALIDATION_ERROR', 'layoutAlign invalid');
    }
    target.layoutAlign = la;
  }
  if ('layoutGrow' in patch) {
    const lg = patch.layoutGrow;
    if (typeof lg !== 'number' || !Number.isFinite(lg) || lg < 0) {
      throw new ValidationErr('VALIDATION_ERROR', 'layoutGrow must be finite number >= 0');
    }
    target.layoutGrow = lg;
  }
  for (const k of ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const) {
    if (k in patch) {
      const v = patch[k];
      if (v === undefined || v === null) {
        delete target[k];
      } else if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        throw new ValidationErr('VALIDATION_ERROR', `${k} must be finite number >= 0`);
      } else {
        target[k] = v;
      }
    }
  }
  if ('isMask' in patch) {
    if (typeof patch.isMask !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'isMask must be boolean');
    target.isMask = patch.isMask;
  }
  if ('layoutSizingHorizontal' in patch) {
    const v = validateLayoutSizing(patch.layoutSizingHorizontal, 'layoutSizingHorizontal');
    if (v === undefined) delete target.layoutSizingHorizontal;
    else target.layoutSizingHorizontal = v;
  }
  if ('layoutSizingVertical' in patch) {
    const v = validateLayoutSizing(patch.layoutSizingVertical, 'layoutSizingVertical');
    if (v === undefined) delete target.layoutSizingVertical;
    else target.layoutSizingVertical = v;
  }
  if ('layoutPositioning' in patch) {
    const v = validateLayoutPositioning(patch.layoutPositioning, 'layoutPositioning');
    if (v === undefined) delete target.layoutPositioning;
    else target.layoutPositioning = v;
  }
  if ('constraints' in patch) {
    const c = patch.constraints;
    if (c === undefined || c === null) delete target.constraints;
    else target.constraints = validateLayoutConstraints(c, 'constraints');
  }
}
