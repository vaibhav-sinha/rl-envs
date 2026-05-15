import type { StyledSegment, TextRangeStyle } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const FLAT_STYLE_KEYS = ['fills', 'fontSize', 'fontWeight', 'hyperlink'] as const;

function normalizeHyperlink(raw: unknown): TextRangeStyle['hyperlink'] | undefined {
  if (!isRecord(raw) || raw.type !== 'URL') return undefined;
  const url =
    typeof raw.url === 'string' ? raw.url : typeof raw.value === 'string' ? raw.value : undefined;
  if (!url) return undefined;
  return { type: 'URL', url };
}

function normalizeRangeStyle(raw: Record<string, unknown>): TextRangeStyle {
  const style: TextRangeStyle = {};
  if (raw.fills !== undefined) style.fills = raw.fills as TextRangeStyle['fills'];
  if (typeof raw.fontSize === 'number') style.fontSize = raw.fontSize;
  if (typeof raw.fontWeight === 'number') style.fontWeight = raw.fontWeight;
  const link = normalizeHyperlink(raw.hyperlink);
  if (link) style.hyperlink = link;
  return style;
}

function extractFlatStyle(seg: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const k of FLAT_STYLE_KEYS) {
    if (k in seg) flat[k] = seg[k];
  }
  return flat;
}

/**
 * Accepts envelope segments `{ start, end, style }` or Figma-flat segments
 * `{ start, end, fontSize?, fills?, hyperlink? }`. Hyperlink targets may use
 * `url` (internal) or `value` (Figma Plugin API).
 */
export function parseStyledSegmentsInput(raw: unknown): StyledSegment[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new ValidationErr('VALIDATION_ERROR', 'styledSegments must be array');
  const out: StyledSegment[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!isRecord(s) || typeof s.start !== 'number' || typeof s.end !== 'number') {
      throw new ValidationErr('VALIDATION_ERROR', `styledSegments[${String(i)}] invalid`);
    }
    const style = isRecord(s.style) ? normalizeRangeStyle(s.style) : normalizeRangeStyle(extractFlatStyle(s));
    out.push({ start: s.start, end: s.end, style });
  }
  return out;
}
