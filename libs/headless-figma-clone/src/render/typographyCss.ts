import type {
  FileEnvelope,
  LeadingTrim,
  LetterSpacing,
  LineHeight,
  TextCase,
  TextDecoration,
  TextListOptions,
  TextNode,
  TextRangeStyle,
} from '../model/types.js';
import {
  cssVarNameForVariable,
  resolveVariableToFloat,
  resolveVariableToStringValue,
} from '../variables/resolution.js';

export interface TypographyInput {
  fontSize?: number;
  lineHeight?: LineHeight;
  letterSpacing?: LetterSpacing;
  leadingTrim?: LeadingTrim;
  textCase?: TextCase;
  textDecoration?: TextDecoration;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  listSpacing?: number;
  hangingPunctuation?: boolean;
  hangingList?: boolean;
  listOptions?: TextListOptions;
  boundVariables?: Partial<Record<string, string>>;
}

/** Default line height multiplier for multi-line / non-hug text when Figma uses AUTO. */
export const AUTO_LINE_HEIGHT_RATIO = 1.22;

/**
 * Figma hug-contents line box for AUTO: tighter than browser `normal`, with descender slack
 * scaled by size (smaller type needs a bit more relative room for g/y/p descenders).
 */
export function hugLayoutLineHeightPx(lineHeight: LineHeight | undefined, fontSize: number): number {
  if (!lineHeight || lineHeight.unit === 'AUTO') {
    const slack = fontSize <= 9 ? 3 : 2;
    return Math.ceil(fontSize + slack);
  }
  return lineHeightPx(lineHeight, fontSize);
}

export function lineHeightPx(lineHeight: LineHeight | undefined, fontSize: number): number {
  if (!lineHeight || lineHeight.unit === 'AUTO') {
    return fontSize * AUTO_LINE_HEIGHT_RATIO + 2;
  }
  if (lineHeight.unit === 'PIXELS') return lineHeight.value;
  return (fontSize * lineHeight.value) / 100;
}

export function lineHeightCss(
  lineHeight: LineHeight | undefined,
  fontSize: number,
  boundVarId?: string,
  env?: FileEnvelope
): string {
  if (boundVarId && env) {
    const v = resolveVariableToFloat(env, boundVarId);
    const fb = v !== null ? v : lineHeightPx(lineHeight, fontSize);
    return `var(${cssVarNameForVariable(boundVarId)},${String(fb)}px)`;
  }
  if (!lineHeight || lineHeight.unit === 'AUTO') {
    return `${String(Math.round(lineHeightPx(lineHeight, fontSize) * 100) / 100)}px`;
  }
  if (lineHeight.unit === 'PIXELS') return `${String(lineHeight.value)}px`;
  return `${String(lineHeight.value)}%`;
}

export function letterSpacingCss(
  letterSpacing: LetterSpacing | undefined,
  fontSize: number,
  boundVarId?: string,
  env?: FileEnvelope
): string {
  if (!letterSpacing && !boundVarId) return '';
  if (boundVarId && env) {
    const v = resolveVariableToFloat(env, boundVarId);
    if (v !== null) return `letter-spacing:${String(v)}px;`;
    return `letter-spacing:var(${cssVarNameForVariable(boundVarId)},0px);`;
  }
  if (!letterSpacing) return '';
  if (letterSpacing.unit === 'PIXELS') return `letter-spacing:${String(letterSpacing.value)}px;`;
  return `letter-spacing:${String((fontSize * letterSpacing.value) / 100)}px;`;
}

export function textCaseCss(textCase: TextCase | undefined): string {
  if (!textCase || textCase === 'ORIGINAL') return '';
  const map: Record<TextCase, string> = {
    ORIGINAL: 'none',
    UPPER: 'uppercase',
    LOWER: 'lowercase',
    TITLE: 'capitalize',
    SMALL_CAPS: 'small-caps',
    SMALL_CAPS_FORCED: 'small-caps',
  };
  return `text-transform:${map[textCase]};`;
}

export function textDecorationCss(dec: TextDecoration | undefined): string {
  if (!dec || dec.type === 'NONE') return '';
  let s = '';
  if (dec.type === 'UNDERLINE') s += 'text-decoration-line:underline;';
  if (dec.type === 'STRIKETHROUGH') s += 'text-decoration-line:line-through;';
  if (dec.style === 'WAVY') s += 'text-decoration-style:wavy;';
  if (dec.style === 'DOTTED') s += 'text-decoration-style:dotted;';
  if (dec.thickness !== undefined) s += `text-decoration-thickness:${String(dec.thickness)}px;`;
  if (dec.offset !== undefined) s += `text-underline-offset:${String(dec.offset)}px;`;
  if (dec.skipInk === true) s += 'text-decoration-skip-ink:auto;';
  if (dec.skipInk === false) s += 'text-decoration-skip-ink:none;';
  if (dec.color) {
    const a = dec.color.a ?? 1;
    s += `text-decoration-color:rgba(${String(Math.round(dec.color.r * 255))},${String(Math.round(dec.color.g * 255))},${String(Math.round(dec.color.b * 255))},${String(a)});`;
  }
  return s;
}

export function listContainerCss(listOptions?: TextListOptions, hangingList?: boolean): string {
  if (!listOptions?.type || listOptions.type === 'NONE') return '';
  let s = 'margin:0;padding-left:1.5em;';
  if (listOptions.type === 'ORDERED') s += 'list-style-type:decimal;';
  if (listOptions.type === 'UNORDERED') s += 'list-style-type:disc;';
  if (listOptions.indent !== undefined) s += `margin-left:${String(listOptions.indent)}px;`;
  if (hangingList) s += 'list-style-position:outside;';
  return s;
}

export function paragraphTypographyCss(
  t: TypographyInput,
  fontSize: number,
  env?: FileEnvelope,
  opts?: { tightAutoLineHeight?: boolean; excludeListLayout?: boolean }
): string {
  let s = '';
  const lh = opts?.tightAutoLineHeight
    ? `${String(hugLayoutLineHeightPx(t.lineHeight, fontSize))}px`
    : lineHeightCss(t.lineHeight, fontSize, t.boundVariables?.lineHeight, env);
  if (lh) s += `line-height:${lh};`;
  else s += 'line-height:normal;';
  s += leadingTrimCss(t.leadingTrim);
  s += letterSpacingCss(t.letterSpacing, fontSize, t.boundVariables?.letterSpacing, env);
  s += textCaseCss(t.textCase);
  s += textDecorationCss(t.textDecoration);
  if (t.paragraphIndent !== undefined && t.paragraphIndent !== 0) {
    const indent = t.boundVariables?.paragraphIndent && env
      ? `var(${cssVarNameForVariable(t.boundVariables.paragraphIndent)},${String(t.paragraphIndent)}px)`
      : `${String(t.paragraphIndent)}px`;
    s += `text-indent:${indent};`;
  }
  if (t.paragraphSpacing !== undefined && t.paragraphSpacing > 0) {
    s += `margin-bottom:${String(t.paragraphSpacing)}px;`;
  }
  if (t.hangingPunctuation) s += 'hanging-punctuation:first last;';
  if (!opts?.excludeListLayout) {
    if (t.listOptions?.type === 'ORDERED') s += 'list-style-type:decimal;';
    if (t.listOptions?.type === 'UNORDERED') s += 'list-style-type:disc;';
    if (t.listOptions?.type && t.listOptions.type !== 'NONE') {
      s += 'display:list-item;';
      if (t.listOptions.indent !== undefined) s += `margin-left:${String(t.listOptions.indent)}px;`;
    }
    if (t.hangingList) s += 'list-style-position:outside;';
    if (t.listSpacing !== undefined && t.listSpacing > 0) s += `margin-top:${String(t.listSpacing)}px;`;
  }
  return s;
}

export function mergeTypographyFromText(t: TextNode, style?: TextRangeStyle): TypographyInput {
  return {
    fontSize: style?.fontSize ?? t.fontSize,
    lineHeight: style?.lineHeight ?? t.lineHeight,
    leadingTrim: t.leadingTrim,
    letterSpacing: style?.letterSpacing ?? t.letterSpacing,
    textCase: style?.textCase ?? undefined,
    textDecoration: style?.textDecoration,
    paragraphIndent: t.paragraphIndent,
    paragraphSpacing: t.paragraphSpacing,
    listSpacing: t.listSpacing,
    hangingPunctuation: t.hangingPunctuation,
    hangingList: t.hangingList,
    listOptions: style?.listOptions ?? t.listOptions,
    boundVariables: {
      ...(t.boundVariables
        ? Object.fromEntries(Object.entries(t.boundVariables).filter(([, v]) => typeof v === 'string'))
        : {}),
      ...(style?.boundVariables ?? {}),
    },
  };
}

export function fontFamilyCssFromName(fontName: { family: string; style: string } | undefined, boundFamily?: string, env?: FileEnvelope): string {
  if (boundFamily && env) {
    const s = resolveVariableToStringValue(env, boundFamily);
    if (s) return `font-family:"${s}",sans-serif;`;
    return `font-family:var(${cssVarNameForVariable(boundFamily)},sans-serif);`;
  }
  if (!fontName) return 'font-family:Inter,sans-serif;';
  return `font-family:"${fontName.family}",sans-serif;`;
}

export function openTypeFeaturesCss(features: Record<string, boolean> | undefined): string {
  if (!features || !Object.keys(features).length) return '';
  const parts = Object.entries(features)
    .filter(([, on]) => on)
    .map(([k]) => `"${k}" 1`);
  return parts.length ? `font-feature-settings:${parts.join(',')};` : '';
}

export function hugTextLineHeightPxFromTypography(fontSize: number, lineHeight?: LineHeight): number {
  return Math.ceil(hugLayoutLineHeightPx(lineHeight, fontSize));
}

export function leadingTrimCss(leadingTrim?: LeadingTrim): string {
  if (leadingTrim === 'CAP_HEIGHT') {
    return 'text-box-trim:trim-both;text-box-edge:cap alphabetic;';
  }
  return '';
}
