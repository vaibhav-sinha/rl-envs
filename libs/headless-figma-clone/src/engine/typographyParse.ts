import type {
  GridTrackSize,
  LetterSpacing,
  LineHeight,
  TextCase,
  TextDecoration,
  TextListOptions,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseLineHeight(raw: unknown, label: string): LineHeight | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'object' && raw !== null && 'unit' in (raw as object)) {
    const o = raw as { unit: string; value?: number };
    if (o.unit === 'AUTO') return { unit: 'AUTO' };
    if (o.unit === 'PIXELS' && typeof o.value === 'number' && Number.isFinite(o.value)) {
      return { unit: 'PIXELS', value: o.value };
    }
    if (o.unit === 'PERCENT' && typeof o.value === 'number' && Number.isFinite(o.value)) {
      return { unit: 'PERCENT', value: o.value };
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return { unit: 'PIXELS', value: raw };
  throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid lineHeight`);
}

export function parseLetterSpacing(raw: unknown, label: string): LetterSpacing | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (isRecord(raw) && typeof raw.unit === 'string') {
    if (raw.unit === 'PIXELS' && typeof raw.value === 'number') return { unit: 'PIXELS', value: raw.value };
    if (raw.unit === 'PERCENT' && typeof raw.value === 'number') return { unit: 'PERCENT', value: raw.value };
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return { unit: 'PIXELS', value: raw };
  throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid letterSpacing`);
}

export function parseTextCase(raw: unknown, label: string): TextCase | undefined {
  if (raw === undefined || raw === null) return undefined;
  const allowed = ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE', 'SMALL_CAPS', 'SMALL_CAPS_FORCED'] as const;
  if (typeof raw === 'string' && (allowed as readonly string[]).includes(raw)) return raw as TextCase;
  throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid textCase`);
}

export function parseTextDecoration(raw: unknown, label: string): TextDecoration | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') {
    if (raw === 'NONE' || raw === 'UNDERLINE' || raw === 'STRIKETHROUGH') return { type: raw };
    throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid textDecoration string`);
  }
  if (!isRecord(raw) || typeof raw.type !== 'string') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid textDecoration`);
  }
  return raw as unknown as TextDecoration;
}

export function parseTextListOptions(raw: unknown, label: string): TextListOptions | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw) || typeof raw.type !== 'string') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid listOptions`);
  }
  const t = raw.type;
  if (t !== 'NONE' && t !== 'ORDERED' && t !== 'UNORDERED') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: listOptions.type invalid`);
  }
  return {
    type: t,
    indent: typeof raw.indent === 'number' ? raw.indent : undefined,
  };
}

export function parseGridTrackSize(raw: unknown, label: string): GridTrackSize {
  if (!isRecord(raw) || typeof raw.type !== 'string') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: invalid GridTrackSize`);
  }
  if (raw.type === 'HUG') return { type: 'HUG' };
  if (raw.type === 'FIXED') {
    if (typeof raw.value !== 'number' || !Number.isFinite(raw.value) || raw.value < 0) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: FIXED.value required`);
    }
    return { type: 'FIXED', value: raw.value };
  }
  if (raw.type === 'FLEX') {
    const v = raw.value;
    if (v === undefined) return { type: 'FLEX' };
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return { type: 'FLEX', value: v };
    throw new ValidationErr('VALIDATION_ERROR', `${label}: FLEX.value invalid`);
  }
  throw new ValidationErr('VALIDATION_ERROR', `${label}: unknown track type`);
}

export function parseGridTrackSizes(raw: unknown, count: number, label: string): GridTrackSize[] {
  if (raw === undefined || raw === null) {
    return Array.from({ length: count }, () => ({ type: 'FLEX' as const }));
  }
  if (!Array.isArray(raw)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be array`);
  const out = raw.map((g, i) => parseGridTrackSize(g, `${label}[${String(i)}]`));
  while (out.length < count) out.push({ type: 'FLEX' });
  return out.slice(0, count);
}

export function parseIndividualStrokeWeights(raw: unknown, label: string): Partial<import('../model/types.js').IndividualStrokeWeights> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be object`);
  const out: Partial<import('../model/types.js').IndividualStrokeWeights> = {};
  for (const k of ['top', 'right', 'bottom', 'left'] as const) {
    const v = raw[k];
    if (v !== undefined) {
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        throw new ValidationErr('VALIDATION_ERROR', `${label}.${k} must be >= 0`);
      }
      out[k] = v;
    }
  }
  return out;
}
