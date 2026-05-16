import type { FontName } from '../model/types.js';
import type { FontAvailabilityEntry } from './fontTypes.js';
import { DEFAULT_FONT } from './fontTypes.js';
import { closestInterStyleForWeight, isFontAvailable } from './localFontRegistry.js';
import { collectDocumentFonts } from './collectDocumentFonts.js';
import type { FileEnvelope } from '../model/types.js';

/** Map Figma style names to approximate CSS weight for substitution. */
const STYLE_WEIGHT_HINT: Record<string, number> = {
  Thin: 100,
  'Extra Light': 200,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  'Semi Bold': 600,
  SemiBold: 600,
  Bold: 700,
  'Extra Bold': 800,
  ExtraBold: 800,
  Black: 900,
};

function weightHintFromStyle(style: string): number {
  return STYLE_WEIGHT_HINT[style] ?? 400;
}

/**
 * Font to use when rendering: local face if available, otherwise Inter with closest weight.
 */
export function resolveRenderingFontName(requested: FontName | undefined): FontName {
  const fn = requested ?? DEFAULT_FONT;
  if (isFontAvailable(fn)) return fn;
  if (fn.family === 'Inter') {
    return closestInterStyleForWeight(weightHintFromStyle(fn.style));
  }
  return closestInterStyleForWeight(weightHintFromStyle(fn.style));
}

export function getFontAvailability(envelope: FileEnvelope): FontAvailabilityEntry[] {
  const used = collectDocumentFonts(envelope);
  return used.map((requested) => {
    const available = isFontAvailable(requested);
    if (available) {
      return { requested, available: true };
    }
    const substitutedTo = resolveRenderingFontName(requested);
    return { requested, available: false, substitutedTo };
  });
}

export function collectRenderingFonts(envelope: FileEnvelope): FontName[] {
  const used = collectDocumentFonts(envelope);
  const seen = new Set<string>();
  const out: FontName[] = [];
  const add = (fn: FontName) => {
    const key = `${fn.family}\0${fn.style}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(fn);
  };
  add(DEFAULT_FONT);
  for (const req of used) {
    add(resolveRenderingFontName(req));
  }
  return out;
}
