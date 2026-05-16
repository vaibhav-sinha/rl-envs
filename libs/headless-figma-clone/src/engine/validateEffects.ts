import type {
  BackgroundBlurEffect,
  BlendMode,
  DropShadowEffect,
  Effect,
  InnerShadowEffect,
  LayerBlurEffect,
  NoiseEffect,
  TextureEffect,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

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

const SUPPORTED_EFFECT_TYPES = new Set([
  'DROP_SHADOW',
  'INNER_SHADOW',
  'BACKGROUND_BLUR',
  'LAYER_BLUR',
  'NOISE',
  'TEXTURE',
]);

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

function validateShadowBase(e: Record<string, unknown>, label: string, type: 'DROP_SHADOW' | 'INNER_SHADOW'): DropShadowEffect | InnerShadowEffect {
  if (!isRecord(e.offset) || typeof e.offset.x !== 'number' || typeof e.offset.y !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: ${type}.offset {x,y} required`);
  }
  if (!isRecord(e.color)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: ${type}.color required`);
  }
  validateRgba(e.color, `${label}.color`);
  const radius = e.radius;
  if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: ${type}.radius must be finite number >= 0`);
  }
  if (typeof e.blendMode !== 'string' || !EFFECT_BLEND_MODES.has(e.blendMode as BlendMode)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: ${type}.blendMode required`);
  }
  if (type === 'DROP_SHADOW') return e as unknown as DropShadowEffect;
  return e as unknown as InnerShadowEffect;
}

function validateDropShadow(e: Record<string, unknown>, label: string): DropShadowEffect {
  const ds = validateShadowBase(e, label, 'DROP_SHADOW') as DropShadowEffect;
  if (e.spread !== undefined && (typeof e.spread !== 'number' || !Number.isFinite(e.spread))) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: DROP_SHADOW.spread must be finite`);
  }
  if (e.showShadowBehindNode !== undefined && typeof e.showShadowBehindNode !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: showShadowBehindNode must be boolean`);
  }
  return ds;
}

function validateInnerShadow(e: Record<string, unknown>, label: string): InnerShadowEffect {
  return validateShadowBase(e, label, 'INNER_SHADOW') as InnerShadowEffect;
}

function validateBlurRadius(e: Record<string, unknown>, label: string, type: string): number {
  const r = e.radius;
  if (typeof r !== 'number' || !Number.isFinite(r) || r < 0) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: ${type}.radius must be finite >= 0`);
  }
  return r;
}

function validateBackgroundBlur(e: Record<string, unknown>, label: string): BackgroundBlurEffect {
  validateBlurRadius(e, label, 'BACKGROUND_BLUR');
  return e as unknown as BackgroundBlurEffect;
}

function validateLayerBlur(e: Record<string, unknown>, label: string): LayerBlurEffect {
  validateBlurRadius(e, label, 'LAYER_BLUR');
  return e as unknown as LayerBlurEffect;
}

function validateNoise(e: Record<string, unknown>, label: string): NoiseEffect {
  if (e.radius !== undefined) validateBlurRadius(e, label, 'NOISE');
  return e as unknown as NoiseEffect;
}

function validateTexture(e: Record<string, unknown>, label: string): TextureEffect {
  if (e.radius !== undefined) validateBlurRadius(e, label, 'TEXTURE');
  return e as unknown as TextureEffect;
}

function validateEffectEntry(e: Record<string, unknown>, label: string): Effect {
  const type = e.type;
  if (type === 'BACKDROP_BLUR') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: use BACKGROUND_BLUR, not BACKDROP_BLUR`);
  }
  if (type === 'DROP_SHADOW') return validateDropShadow(e, label);
  if (type === 'INNER_SHADOW') return validateInnerShadow(e, label);
  if (type === 'BACKGROUND_BLUR') return validateBackgroundBlur(e, label);
  if (type === 'LAYER_BLUR') return validateLayerBlur(e, label);
  if (type === 'NOISE') return validateNoise(e, label);
  if (type === 'TEXTURE') return validateTexture(e, label);
  if (typeof type === 'string' && !SUPPORTED_EFFECT_TYPES.has(type)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: unsupported effect type "${type}"`);
  }
  throw new ValidationErr('VALIDATION_ERROR', `${label}: effect type required`);
}

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
