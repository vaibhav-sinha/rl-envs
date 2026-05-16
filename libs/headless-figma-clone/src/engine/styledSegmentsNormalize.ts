import type { StyledSegment, TextRangeStyle } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import {
  parseLetterSpacing,
  parseLineHeight,
  parseTextCase,
  parseTextDecoration,
  parseTextListOptions,
} from './typographyParse.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const FLAT_STYLE_KEYS = [
  'fills',
  'fontName',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textCase',
  'textDecoration',
  'hyperlink',
  'textStyleId',
  'fillStyleId',
  'listOptions',
  'openTypeFeatures',
  'boundVariables',
] as const;

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
  if (isRecord(raw.fontName) && typeof raw.fontName.family === 'string') {
    style.fontName = { family: raw.fontName.family, style: typeof raw.fontName.style === 'string' ? raw.fontName.style : 'Regular' };
  }
  if (typeof raw.fontSize === 'number') style.fontSize = raw.fontSize;
  if (typeof raw.fontWeight === 'number') style.fontWeight = raw.fontWeight;
  if (raw.lineHeight !== undefined) style.lineHeight = parseLineHeight(raw.lineHeight, 'styledSegments.lineHeight');
  if (raw.letterSpacing !== undefined) style.letterSpacing = parseLetterSpacing(raw.letterSpacing, 'styledSegments.letterSpacing');
  if (raw.textCase !== undefined) style.textCase = parseTextCase(raw.textCase, 'styledSegments.textCase');
  if (raw.textDecoration !== undefined) style.textDecoration = parseTextDecoration(raw.textDecoration, 'styledSegments.textDecoration');
  const link = normalizeHyperlink(raw.hyperlink);
  if (link) style.hyperlink = link;
  if (typeof raw.textStyleId === 'string') style.textStyleId = raw.textStyleId;
  if (typeof raw.fillStyleId === 'string') style.fillStyleId = raw.fillStyleId;
  if (raw.listOptions !== undefined) style.listOptions = parseTextListOptions(raw.listOptions, 'styledSegments.listOptions');
  if (isRecord(raw.openTypeFeatures)) style.openTypeFeatures = raw.openTypeFeatures as Record<string, boolean>;
  if (isRecord(raw.boundVariables)) style.boundVariables = raw.boundVariables as TextRangeStyle['boundVariables'];
  return style;
}

function extractFlatStyle(seg: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  for (const k of FLAT_STYLE_KEYS) {
    if (k in seg) flat[k] = seg[k];
  }
  return flat;
}

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
