import { serializeValue } from './serializeValue.js';

const STYLED_SEGMENT_FIELDS = [
  'fontName',
  'fontSize',
  'fontWeight',
  'fills',
  'lineHeight',
  'letterSpacing',
  'textCase',
  'textDecoration',
  'textDecorationStyle',
  'textDecorationOffset',
  'textDecorationThickness',
  'textDecorationColor',
  'textDecorationSkipInk',
  'hyperlink',
  'listOptions',
  'openTypeFeatures',
  'textStyleId',
  'fillStyleId',
] as const;

function isMixedSymbol(v: unknown): boolean {
  return typeof v === 'symbol';
}

function decorationThicknessPx(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const v = (raw as { value?: unknown }).value;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function decorationOffsetPx(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const v = (raw as { value?: unknown }).value;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}

function buildTextDecorationExport(seg: Record<string, unknown>, visited: WeakSet<object>): unknown | undefined {
  const type = seg.textDecoration;
  if (typeof type !== 'string' || type === 'NONE') return undefined;
  const dec: Record<string, unknown> = { type };
  const style = seg.textDecorationStyle;
  if (typeof style === 'string') dec.style = style;
  const thickness = decorationThicknessPx(seg.textDecorationThickness);
  if (thickness !== undefined) dec.thickness = thickness;
  const offset = decorationOffsetPx(seg.textDecorationOffset);
  if (offset !== undefined) dec.offset = offset;
  if (seg.textDecorationSkipInk === true || seg.textDecorationSkipInk === false) {
    dec.skipInk = seg.textDecorationSkipInk;
  }
  const color = serializeValue(seg.textDecorationColor, visited);
  if (color && typeof color === 'object') dec.color = color;
  return dec;
}

function segmentHasStyleFields(flat: Record<string, unknown>): boolean {
  return Object.keys(flat).some((k) => k !== 'start' && k !== 'end');
}

/**
 * Figma does not expose `styledSegments` as a node property; build it from
 * {@link TextNode.getStyledTextSegments} so mixed underline/strikethrough survive export.
 */
export function enrichTextNodeExport(
  node: TextNode,
  props: Record<string, unknown>,
  visited: WeakSet<object>
): void {
  if (typeof node.getStyledTextSegments !== 'function') return;
  try {
    const raw = node.getStyledTextSegments([...STYLED_SEGMENT_FIELDS]);
    const styledSegments: Record<string, unknown>[] = [];
    for (const seg of raw) {
      const rec = seg as Record<string, unknown>;
      const flat: Record<string, unknown> = {
        start: rec.start,
        end: rec.end,
      };
      const decoration = buildTextDecorationExport(rec, visited);
      if (decoration) flat.textDecoration = decoration;
      for (const key of STYLED_SEGMENT_FIELDS) {
        if (
          key === 'textDecoration' ||
          key === 'textDecorationStyle' ||
          key === 'textDecorationOffset' ||
          key === 'textDecorationThickness' ||
          key === 'textDecorationColor' ||
          key === 'textDecorationSkipInk'
        ) {
          continue;
        }
        const v = rec[key];
        if (v === undefined || isMixedSymbol(v)) continue;
        const serialized = serializeValue(v, visited);
        if (serialized !== undefined) flat[key] = serialized;
      }
      if (segmentHasStyleFields(flat)) styledSegments.push(flat);
    }
    if (styledSegments.length > 0) props.styledSegments = styledSegments;
  } catch {
    /* fonts unloaded or API unavailable */
  }
}
