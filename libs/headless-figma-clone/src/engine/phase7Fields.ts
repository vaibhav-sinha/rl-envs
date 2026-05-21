import type {
  DocumentNode,
  FontName,
  LayoutConstraints,
  LayoutPositioning,
  LayoutSelfFields,
  LayoutSizing,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import {
  assertGridChildLayoutField,
  GRID_CHILD_LAYOUT_FIELDS,
  validateGridAnchorValue,
  validateGridSpanValue,
} from './gridChildValidate.js';
import { normalizeLayoutConstraints } from './figmaInterop.js';

const LAYOUT_SIZING = new Set<LayoutSizing>(['FIXED', 'HUG', 'FILL']);
const LAYOUT_POSITIONING = new Set<LayoutPositioning>(['AUTO', 'ABSOLUTE']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export { validateAxisSizingMode } from './axisSizingMode.js';

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
  return normalizeLayoutConstraints(v, label);
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

const LAYOUT_SELF_SPEC_KEYS = [
  'layoutAlign',
  'layoutGrow',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'isMask',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'layoutPositioning',
  'constraints',
  ...GRID_CHILD_LAYOUT_FIELDS,
  'gridChildHorizontalAlign',
  'gridChildVerticalAlign',
] as const;

/** Copy layout-self fields from a create-node spec onto a new scene node. */
export function applyLayoutSelfFromSpec(target: LayoutSelfFields, spec: Record<string, unknown>): void {
  const patch: Record<string, unknown> = {};
  for (const k of LAYOUT_SELF_SPEC_KEYS) {
    if (k in spec && spec[k] !== undefined) patch[k] = spec[k];
  }
  if (Object.keys(patch).length > 0) applyLayoutSelfPatch(target, patch);
}

export type LayoutSelfPatchContext = { document: DocumentNode; nodeId: string };

/** Apply Phase 7 layout-self patch keys onto any node carrying {@link LayoutSelfFields}. */
export function applyLayoutSelfPatch(
  target: LayoutSelfFields,
  patch: Record<string, unknown>,
  ctx?: LayoutSelfPatchContext
): void {
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
  for (const field of GRID_CHILD_LAYOUT_FIELDS) {
    if (!(field in patch)) continue;
    if (ctx) assertGridChildLayoutField(ctx.document, ctx.nodeId, field);
    const v = patch[field];
    if (v === undefined || v === null) {
      delete target[field];
      continue;
    }
    if (field === 'gridRowSpan' || field === 'gridColumnSpan') {
      target[field] = validateGridSpanValue(field, v);
    } else {
      target[field] = validateGridAnchorValue(field, v);
    }
  }
  for (const field of ['gridChildHorizontalAlign', 'gridChildVerticalAlign'] as const) {
    if (!(field in patch)) continue;
    if (ctx) assertGridChildLayoutField(ctx.document, ctx.nodeId, field);
    const v = patch[field];
    if (v === undefined || v === null) delete target[field];
    else if (v === 'MIN' || v === 'CENTER' || v === 'MAX' || v === 'AUTO') target[field] = v;
    else throw new ValidationErr('VALIDATION_ERROR', `${field} invalid`);
  }
}

export function assertGridChildFieldsInCreateSpec(
  parentType: string,
  parentLayoutMode: string | undefined,
  spec: Record<string, unknown>
): void {
  const field = GRID_CHILD_LAYOUT_FIELDS.find((f) => spec[f] !== undefined);
  if (!field) return;
  if (parentType !== 'FRAME' || parentLayoutMode !== 'GRID') {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `in set_${field}: Node must be a grid child to set ${field === 'gridRowSpan' ? 'row span' : field === 'gridColumnSpan' ? 'column span' : field}`
    );
  }
}
