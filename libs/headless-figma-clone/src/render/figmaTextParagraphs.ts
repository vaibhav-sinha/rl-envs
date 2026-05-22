import type { FileEnvelope, TextNode } from '../model/types.js';
import { resolveVariableToStringValue } from '../variables/resolution.js';

/** Figma line/paragraph separators: U+2028 = line break; U+2029 / `\n` = paragraph break. */
const FIGMA_PARAGRAPH_BREAK_RE = /\u2029|\n/g;

/** Map U+2028/U+2029 to `\n` for browser `pre-wrap` (same code-unit length). */
export function normalizeFigmaText(s: string): string {
  return s.replace(/\u2028/g, '\n').replace(/\u2029/g, '\n');
}

export function rawTextCharacters(t: TextNode, env: FileEnvelope): string {
  const vid = t.boundVariables?.characters;
  return !vid ? (t.characters ?? '') : (resolveVariableToStringValue(env, vid) ?? t.characters ?? '');
}

/** Paragraph boundaries for spacing: `\n` and U+2029 only (not U+2028 line separator). */
export function splitFigmaParagraphRanges(raw: string): Array<{ start: number; end: number }> {
  if (!raw.length) return [{ start: 0, end: 0 }];
  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;
  let m: RegExpExecArray | null;
  FIGMA_PARAGRAPH_BREAK_RE.lastIndex = 0;
  while ((m = FIGMA_PARAGRAPH_BREAK_RE.exec(raw)) !== null) {
    ranges.push({ start, end: m.index });
    start = m.index + m[0].length;
  }
  ranges.push({ start, end: raw.length });
  return ranges;
}

export function figmaParagraphCount(raw: string): number {
  return splitFigmaParagraphRanges(raw).length;
}
