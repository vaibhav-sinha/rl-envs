import type {
  FontName,
  Paint,
  TextBoundVariableField,
  TextCase,
  TextDecoration,
  TextListOptions,
  TextNode,
  TextRangeStyle,
  StyledSegment,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';
import { parseStyledSegmentsInput } from '../engine/styledSegmentsNormalize.js';
function deepClone<T>(v: T): T {
  return structuredClone(v);
}

export interface TextScriptDeps {
  deletedIds: Set<string>;
  lookup: (id: string) => TextNode | null;
  update: (id: string, patch: Record<string, unknown>) => void;
}

function liveText(deps: TextScriptDeps, id: string): TextNode {
  const live = deps.lookup(id);
  if (!live || deps.deletedIds.has(id)) {
    throw new ValidationErr('VALIDATION_ERROR', 'Expected TEXT node');
  }
  return live;
}

function readSegments(t: TextNode): StyledSegment[] {
  return t.styledSegments ? [...t.styledSegments] : [];
}

function writeSegments(deps: TextScriptDeps, id: string, segments: StyledSegment[]): void {
  deps.update(id, { styledSegments: segments });
}

function applyRangeStyle(
  deps: TextScriptDeps,
  id: string,
  start: number,
  end: number,
  patch: Partial<TextRangeStyle>
): void {
  const t = liveText(deps, id);
  const segments = readSegments(t);
  const i = segments.findIndex((s) => s.start === start && s.end === end);
  if (i >= 0) {
    segments[i] = { start, end, style: { ...segments[i]!.style, ...patch } };
  } else {
    segments.push({ start, end, style: { ...patch } });
  }
  writeSegments(deps, id, segments);
}

export function textGetStyledTextSegments(
  deps: TextScriptDeps,
  id: string,
  fields: Array<keyof TextRangeStyle>,
  start = 0,
  end?: number
): Array<{ start: number; end: number } & Partial<TextRangeStyle>> {
  const t = liveText(deps, id);
  const endIdx = end ?? t.characters.length;
  const out: Array<{ start: number; end: number } & Partial<TextRangeStyle>> = [];
  const segs = readSegments(t).sort((a, b) => a.start - b.start);
  let i = start;
  while (i < endIdx) {
    const seg = segs.find((s) => s.start <= i && s.end > i);
    const slice: { start: number; end: number } & Partial<TextRangeStyle> = {
      start: i,
      end: seg ? Math.min(seg.end, endIdx) : endIdx,
    };
    const style = seg?.style ?? {};
    for (const f of fields) {
      if (f in style) (slice as Record<string, unknown>)[f] = style[f];
      else if (f === 'fontSize' && t.fontSize !== undefined) slice.fontSize = t.fontSize;
      else if (f === 'fontWeight' && t.fontWeight !== undefined) slice.fontWeight = t.fontWeight;
      else if (f === 'fontName' && t.fontName) slice.fontName = t.fontName;
      else if (f === 'fills' && t.fills) slice.fills = t.fills;
      else if (f === 'lineHeight' && t.lineHeight) slice.lineHeight = t.lineHeight;
      else if (f === 'letterSpacing' && t.letterSpacing) slice.letterSpacing = t.letterSpacing;
    }
    out.push(slice);
    i = slice.end;
  }
  return out;
}

export function createTextHandleMethodTable(deps: TextScriptDeps, id: string): Record<string, unknown> {
  return {
    getStyledTextSegments: (
      fields: Array<keyof TextRangeStyle>,
      start?: number,
      end?: number
    ) => textGetStyledTextSegments(deps, id, fields, start, end),
    setRangeFontSize: (start: number, end: number, fontSize: number) =>
      applyRangeStyle(deps, id, start, end, { fontSize }),
    setRangeFills: (start: number, end: number, fills: Paint[]) =>
      applyRangeStyle(deps, id, start, end, { fills: deepClone(fills) }),
    setRangeFontName: (start: number, end: number, fontName: FontName) =>
      applyRangeStyle(deps, id, start, end, { fontName }),
    setRangeLineHeight: (start: number, end: number, lineHeight: TextNode['lineHeight']) =>
      applyRangeStyle(deps, id, start, end, { lineHeight }),
    setRangeLetterSpacing: (start: number, end: number, letterSpacing: TextNode['letterSpacing']) =>
      applyRangeStyle(deps, id, start, end, { letterSpacing }),
    setRangeTextCase: (start: number, end: number, textCase: TextCase) =>
      applyRangeStyle(deps, id, start, end, { textCase }),
    setRangeTextDecoration: (start: number, end: number, textDecoration: TextDecoration) =>
      applyRangeStyle(deps, id, start, end, { textDecoration }),
    setRangeListOptions: (start: number, end: number, listOptions: TextListOptions) =>
      applyRangeStyle(deps, id, start, end, { listOptions }),
    setRangeHyperlink: (start: number, end: number, hyperlink: { type: 'URL'; url: string } | null) => {
      if (hyperlink === null) {
        const t = liveText(deps, id);
        const segments = readSegments(t);
        const i = segments.findIndex((s) => s.start === start && s.end === end);
        if (i >= 0) {
          const style = { ...segments[i]!.style };
          delete style.hyperlink;
          segments[i] = { start, end, style };
          writeSegments(deps, id, segments);
        }
        return;
      }
      applyRangeStyle(deps, id, start, end, { hyperlink });
    },
    setRangeBoundVariable: (
      start: number,
      end: number,
      field: TextBoundVariableField,
      variable: { id: string } | null
    ) => {
      const allowed: TextBoundVariableField[] = [
        'fontFamily',
        'fontSize',
        'fontStyle',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'paragraphSpacing',
        'paragraphIndent',
      ];
      if (!allowed.includes(field)) {
        throw new ValidationErr('VALIDATION_ERROR', `setRangeBoundVariable: unsupported field ${field}`);
      }
      const t = liveText(deps, id);
      const segments = readSegments(t);
      const i = segments.findIndex((s) => s.start === start && s.end === end);
      const prev = i >= 0 ? { ...(segments[i]!.style.boundVariables ?? {}) } : {};
      if (variable === null) delete prev[field];
      else prev[field] = variable.id;
      const boundVariables = Object.keys(prev).length ? prev : undefined;
      applyRangeStyle(deps, id, start, end, { boundVariables });
    },
  };
}

export const TEXT_HANDLE_METHOD_KEYS = new Set([
  'getStyledTextSegments',
  'setRangeFontSize',
  'setRangeFills',
  'setRangeFontName',
  'setRangeLineHeight',
  'setRangeLetterSpacing',
  'setRangeTextCase',
  'setRangeTextDecoration',
  'setRangeListOptions',
  'setRangeHyperlink',
  'setRangeBoundVariable',
]);
