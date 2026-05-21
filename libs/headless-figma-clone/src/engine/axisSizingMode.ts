import type { AxisSizingMode } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

const AXIS_SIZING = new Set<AxisSizingMode>(['FIXED', 'AUTO']);

/** Normalize legacy HUG/FILL axis values from stored envelopes to Figma AUTO. */
export function normalizeAxisSizingModeStored(v: unknown): AxisSizingMode | undefined {
  if (v === undefined || v === null) return undefined;
  if (v === 'FIXED') return 'FIXED';
  if (v === 'AUTO' || v === 'HUG' || v === 'FILL') return 'AUTO';
  return undefined;
}

export function validateAxisSizingMode(v: unknown, label: string): AxisSizingMode | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !AXIS_SIZING.has(v as AxisSizingMode)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label} must be FIXED or AUTO`);
  }
  return v as AxisSizingMode;
}

/** Figma plugin API exposes AUTO for hug-contents axis sizing. */
export function exposeAxisSizingMode(v: unknown): AxisSizingMode | undefined {
  return normalizeAxisSizingModeStored(v);
}
