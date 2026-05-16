import type { FontName, LetterSpacing, LineHeight } from '../model/types.js';
import { resolveRenderingFontName } from './fontSubstitution.js';
import { getFontMetrics } from './localFontRegistry.js';

const TEXT_WIDTH_CHAR_FACTOR = 0.62;

function advanceEmForChar(metrics: { advancesEm: Record<string, number>; avgAdvanceEm: number }, ch: string): number {
  return metrics.advancesEm[ch] ?? metrics.avgAdvanceEm;
}

function letterSpacingPx(letterSpacing: LetterSpacing | undefined, fontSize: number): number {
  if (!letterSpacing) return 0;
  if (letterSpacing.unit === 'PIXELS') return letterSpacing.value;
  return (fontSize * letterSpacing.value) / 100;
}

/**
 * Sum glyph advances at `fontSize` using precomputed metrics (substituted font when missing).
 */
export function measureTextWidthPx(
  chars: string,
  fontSize: number,
  fontName: FontName | undefined,
  letterSpacing?: LetterSpacing
): number {
  const resolved = resolveRenderingFontName(fontName);
  const metrics = getFontMetrics(resolved);
  const ls = letterSpacingPx(letterSpacing, fontSize);

  if (!metrics || chars.length === 0) {
    const raw = chars.length * fontSize * TEXT_WIDTH_CHAR_FACTOR;
    return Math.max(0, Math.ceil(raw) + Math.ceil(fontSize * 0.35));
  }

  let sumEm = 0;
  for (const ch of chars) {
    sumEm += advanceEmForChar(metrics, ch);
  }
  const extraSpacing = chars.length > 1 ? ls * (chars.length - 1) : 0;
  const width = sumEm * fontSize + extraSpacing;
  return Math.max(0, Math.ceil(width) + Math.ceil(fontSize * 0.35));
}

/** Average advance width in px (for wrapped line estimates). */
export function averageCharWidthPx(fontSize: number, fontName: FontName | undefined): number {
  const resolved = resolveRenderingFontName(fontName);
  const metrics = getFontMetrics(resolved);
  const em = metrics?.avgAdvanceEm ?? TEXT_WIDTH_CHAR_FACTOR;
  return fontSize * em;
}

/**
 * Line height in px from metrics when AUTO; otherwise delegates to typography helpers.
 */
export function metricsLineHeightPx(
  fontSize: number,
  lineHeight: LineHeight | undefined,
  fontName: FontName | undefined
): number {
  if (lineHeight && lineHeight.unit !== 'AUTO') {
    if (lineHeight.unit === 'PIXELS') return lineHeight.value;
    return (fontSize * lineHeight.value) / 100;
  }

  const resolved = resolveRenderingFontName(fontName);
  const metrics = getFontMetrics(resolved);
  if (metrics) {
    return Math.ceil(metrics.autoLineHeightEm * fontSize);
  }
  const slack = fontSize <= 9 ? 3 : 2;
  return Math.ceil(fontSize + slack);
}
