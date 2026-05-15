import type { BlendMode, BackgroundBlurEffect, DropShadowEffect, Effect } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Blend modes allowed on Figma shadow effects (excludes PASS_THROUGH). */
const EFFECT_BLEND_MODES = new Set<BlendMode>([
  'NORMAL',
  'MULTIPLY',
  'SCREEN',
  'OVERLAY',
  'DARKEN',
  'LIGHTEN',
  'COLOR_DODGE',
  'COLOR_BURN',
  'HARD_LIGHT',
  'SOFT_LIGHT',
  'DIFFERENCE',
  'EXCLUSION',
  'HUE',
  'SATURATION',
  'COLOR',
  'LUMINOSITY',
]);

const SUPPORTED_EFFECT_TYPES = new Set(['DROP_SHADOW', 'BACKGROUND_BLUR']);

function validateRgb(c: { r: unknown; g: unknown; b: unknown }, label: string): void {
  for (const k of ['r', 'g', 'b'] as const) {
    const v = c[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.${k} must be finite number 0..1`);
    }
  }
}

function validateRgba(c: Record<string, unknown>, label: string): void {
  validateRgb(c as { r: unknown; g: unknown; b: unknown }, label);
  if (c.a !== undefined) {
    if (typeof c.a !== 'number' || !Number.isFinite(c.a) || c.a < 0 || c.a > 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.a must be finite number 0..1`);
    }
  }
}

function validateDropShadow(e: Record<string, unknown>, label: string): DropShadowEffect {
  if (!isRecord(e.offset) || typeof e.offset.x !== 'number' || typeof e.offset.y !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: DROP_SHADOW.offset {x,y} required`);
  }
  if (!Number.isFinite(e.offset.x) || !Number.isFinite(e.offset.y)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: DROP_SHADOW.offset {x,y} must be finite`);
  }
  if (!isRecord(e.color)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: DROP_SHADOW.color required`);
  }
  validateRgba(e.color, `${label}.color`);
  const radius = e.radius;
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: DROP_SHADOW.radius must be finite number >= 0`);
  }
  if (typeof e.blendMode !== 'string' || !EFFECT_BLEND_MODES.has(e.blendMode as BlendMode)) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `${label}: DROP_SHADOW.blendMode required (e.g. "NORMAL")`
    );
  }
  if (e.spread !== undefined) {
    if (typeof e.spread !== 'number' || !Number.isFinite(e.spread)) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: DROP_SHADOW.spread must be finite number`);
    }
  }
  if (e.visible !== undefined && typeof e.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: DROP_SHADOW.visible must be boolean`);
  }
  if (e.showShadowBehindNode !== undefined && typeof e.showShadowBehindNode !== 'boolean') {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `${label}: DROP_SHADOW.showShadowBehindNode must be boolean`
    );
  }
  return e as unknown as DropShadowEffect;
}

function validateBackgroundBlur(e: Record<string, unknown>, label: string): BackgroundBlurEffect {
  const r = e.radius;
  if (typeof r !== 'number' || !Number.isFinite(r) || r < 0) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `${label}: BACKGROUND_BLUR.radius must be finite number >= 0`
    );
  }
  if (e.visible !== undefined && typeof e.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: BACKGROUND_BLUR.visible must be boolean`);
  }
  return e as unknown as BackgroundBlurEffect;
}

function validateEffectEntry(e: Record<string, unknown>, label: string): Effect {
  const type = e.type;
  if (type === 'BACKDROP_BLUR') {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `${label}: use BACKGROUND_BLUR (Figma effect type), not BACKDROP_BLUR`
    );
  }
  if (type === 'DROP_SHADOW') return validateDropShadow(e, label);
  if (type === 'BACKGROUND_BLUR') return validateBackgroundBlur(e, label);
  if (typeof type === 'string' && !SUPPORTED_EFFECT_TYPES.has(type)) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `${label}: unsupported effect type "${type}" (supported: ${[...SUPPORTED_EFFECT_TYPES].join(', ')})`
    );
  }
  throw new ValidationErr('VALIDATION_ERROR', `${label}: effect type required`);
}

/** Validate node/style effects arrays using Figma plugin API names and required fields. */
export function validateEffects(arr: unknown, label: string): Effect[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw new ValidationErr('VALIDATION_ERROR', `${label}: must be array`);
  return arr.map((item, i) => {
    if (!isRecord(item)) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}]: invalid`);
    }
    return validateEffectEntry(item, `${label}[${String(i)}]`);
  });
}
