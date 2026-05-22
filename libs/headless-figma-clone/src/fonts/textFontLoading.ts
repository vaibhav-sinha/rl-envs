import type { FontName, StyledSegment, TextNode, TextRangeStyle } from '../model/types.js';
import { collectTextNodeFonts } from './collectDocumentFonts.js';
import { isFontLoaded } from './fontCatalog.js';
import { DEFAULT_FONT } from './fontTypes.js';

function fontKey(fn: FontName): string {
  return `${fn.family}\0${fn.style}`;
}

const TEXT_LAYOUT_PATCH_KEYS = new Set([
  'characters',
  'fontSize',
  'fontWeight',
  'textStyleId',
  'textCase',
  'textDecoration',
  'letterSpacing',
  'leadingTrim',
  'lineHeight',
  'textAlignHorizontal',
  'textAlignVertical',
  'textAutoResize',
  'textTruncation',
  'maxLines',
  'paragraphIndent',
  'paragraphSpacing',
  'listSpacing',
  'hangingPunctuation',
  'hangingList',
  'listOptions',
  'boundVariables',
]);

const RANGE_LAYOUT_STYLE_KEYS: Array<keyof TextRangeStyle> = [
  'fontSize',
  'fontWeight',
  'textStyleId',
  'textCase',
  'textDecoration',
  'letterSpacing',
  'lineHeight',
  'listOptions',
  'boundVariables',
];

function parseFontNameFromPatch(value: unknown): FontName {
  if (!value || typeof value !== 'object') {
    throw new Error('fontName must be an object with family and style');
  }
  const o = value as { family?: unknown; style?: unknown };
  if (typeof o.family !== 'string' || typeof o.style !== 'string') {
    throw new Error('fontName must be an object with family and style');
  }
  return { family: o.family, style: o.style };
}

function segmentStyleNeedsExistingFonts(style: TextRangeStyle): boolean {
  return RANGE_LAYOUT_STYLE_KEYS.some((k) => k in style);
}

function parseStyledSegmentsForAssert(raw: unknown): StyledSegment[] {
  if (!Array.isArray(raw)) return [];
  const out: StyledSegment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as { start?: unknown; end?: unknown; style?: unknown };
    if (typeof o.start !== 'number' || typeof o.end !== 'number') continue;
    const style =
      o.style && typeof o.style === 'object' ? (o.style as TextRangeStyle) : ({} as TextRangeStyle);
    out.push({ start: o.start, end: o.end, style });
  }
  return out;
}

function throwIfFontsNotLoaded(fonts: Iterable<FontName>): void {
  for (const fn of fonts) {
    if (!isFontLoaded(fn)) {
      throw new Error(`The font "${fn.family} ${fn.style}" is not loaded`);
    }
  }
}

/**
 * Enforce Figma-style font loading before text layout mutations.
 * Inter is preloaded; other families require `figma.loadFontAsync`.
 */
export function assertTextFontsLoadedForPatch(t: TextNode, patch: Record<string, unknown>): void {
  const required = new Map<string, FontName>();
  const add = (fontName: FontName | undefined) => {
    const fn = fontName ?? DEFAULT_FONT;
    required.set(fontKey(fn), fn);
  };

  if ('fontName' in patch && patch.fontName != null) {
    add(parseFontNameFromPatch(patch.fontName));
  }

  const hasNodeLayoutPatch = Object.keys(patch).some(
    (k) => k !== 'fontName' && TEXT_LAYOUT_PATCH_KEYS.has(k)
  );
  if (hasNodeLayoutPatch) {
    for (const fn of collectTextNodeFonts(t)) add(fn);
  }

  if ('styledSegments' in patch) {
    for (const seg of parseStyledSegmentsForAssert(patch.styledSegments)) {
      const style = seg.style ?? {};
      if (segmentStyleNeedsExistingFonts(style)) {
        add(style.fontName ?? t.fontName);
      } else if ('fontName' in style) {
        add(style.fontName);
      }
    }
  }

  throwIfFontsNotLoaded(required.values());
}

/** Assert fonts for a newly created TEXT node when the create spec includes layout-affecting fields. */
export function assertTextFontsLoadedForNewText(t: TextNode, spec: Record<string, unknown>): void {
  const patch: Record<string, unknown> = {};
  if (typeof spec.characters === 'string' && spec.characters.length > 0) patch.characters = spec.characters;
  for (const k of TEXT_LAYOUT_PATCH_KEYS) {
    if (k in spec) patch[k] = spec[k];
  }
  if ('fontName' in spec && spec.fontName != null) patch.fontName = spec.fontName;
  if ('styledSegments' in spec) patch.styledSegments = spec.styledSegments;
  if (Object.keys(patch).length === 0) return;
  assertTextFontsLoadedForPatch(t, patch);
}
