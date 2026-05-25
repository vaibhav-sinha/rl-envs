import type {
  FileEnvelope,
  FontName,
  LeadingTrim,
  LetterSpacing,
  LineHeight,
  TextCase,
  TextDecoration,
  TextListOptions,
  TextNode,
  TextRangeStyle,
} from '../model/types.js';
import { resolveRenderingFontName } from '../fonts/fontSubstitution.js';
import { metricsLineHeightPx } from '../fonts/textMetrics.js';
import {
  cssVarNameForVariable,
  resolveVariableToFloat,
  resolveVariableToStringValue,
} from '../variables/resolution.js';

export interface TypographyInput {
  fontName?: FontName;
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
export function hugLayoutLineHeightPx(
  lineHeight: LineHeight | undefined,
  fontSize: number,
  fontName?: FontName
): number {
  if (!lineHeight || lineHeight.unit === 'AUTO') {
    return metricsLineHeightPx(fontSize, lineHeight, fontName);
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
  opts?: { tightAutoLineHeight?: boolean; excludeListLayout?: boolean; omitParagraphSpacing?: boolean }
): string {
  let s = '';
  const lh = opts?.tightAutoLineHeight
    ? `${String(hugLayoutLineHeightPx(t.lineHeight, fontSize, t.fontName))}px`
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
  if (!opts?.omitParagraphSpacing && t.paragraphSpacing !== undefined && t.paragraphSpacing > 0) {
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

export function mergeTypographyFromText(t: TextNode, style?: TextRangeStyle, env?: FileEnvelope): TypographyInput {
  const fromStyle = resolveTextStyleTypography(t, env);
  return {
    fontName: style?.fontName ?? fromStyle.fontName ?? t.fontName,
    fontSize: style?.fontSize ?? fromStyle.fontSize ?? t.fontSize,
    lineHeight: style?.lineHeight ?? fromStyle.lineHeight ?? t.lineHeight,
    leadingTrim: fromStyle.leadingTrim ?? t.leadingTrim,
    letterSpacing: style?.letterSpacing ?? fromStyle.letterSpacing ?? t.letterSpacing,
    textCase: style?.textCase ?? fromStyle.textCase ?? t.textCase,
    textDecoration: style?.textDecoration ?? fromStyle.textDecoration ?? t.textDecoration,
    paragraphIndent: fromStyle.paragraphIndent ?? t.paragraphIndent,
    paragraphSpacing: fromStyle.paragraphSpacing ?? t.paragraphSpacing,
    listSpacing: fromStyle.listSpacing ?? t.listSpacing,
    hangingPunctuation: fromStyle.hangingPunctuation ?? t.hangingPunctuation,
    hangingList: fromStyle.hangingList ?? t.hangingList,
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
  const resolved = resolveRenderingFontName(fontName);
  return `font-family:"${resolved.family}",sans-serif;`;
}

export function openTypeFeaturesCss(features: Record<string, boolean> | undefined): string {
  if (!features || !Object.keys(features).length) return '';
  const parts = Object.entries(features)
    .filter(([, on]) => on)
    .map(([k]) => `"${k}" 1`);
  return parts.length ? `font-feature-settings:${parts.join(',')};` : '';
}

export function hugTextLineHeightPxFromTypography(
  fontSize: number,
  lineHeight?: LineHeight,
  fontName?: FontName
): number {
  return Math.ceil(hugLayoutLineHeightPx(lineHeight, fontSize, fontName));
}

function linkedTextStyle(t: TextNode, env?: FileEnvelope) {
  if (!env || !t.textStyleId) return undefined;
  return env.textStyles?.find((s) => s.id === t.textStyleId);
}

/** Node-level font name (text style override), ignoring per-range overrides. */
export function effectiveTextBaseFontName(t: TextNode, env?: FileEnvelope): FontName | undefined {
  const st = linkedTextStyle(t, env);
  if (st?.fontName) return st.fontName;
  return t.fontName;
}

/** Typography fields from linked text style (when textStyleId is set). */
export function resolveTextStyleTypography(t: TextNode, env?: FileEnvelope): Partial<TypographyInput> {
  const st = linkedTextStyle(t, env);
  if (!st) return {};
  return {
    fontName: st.fontName,
    fontSize: st.fontSize,
    lineHeight: st.lineHeight,
    leadingTrim: st.leadingTrim,
    letterSpacing: st.letterSpacing,
    textCase: st.textCase,
    textDecoration: st.textDecoration,
    paragraphIndent: st.paragraphIndent,
    paragraphSpacing: st.paragraphSpacing,
    listSpacing: st.listSpacing,
    hangingPunctuation: st.hangingPunctuation,
    hangingList: st.hangingList,
  };
}

/** Node-level font size (variables + text style), ignoring per-range overrides. */
export function effectiveTextBaseFontSizePx(t: TextNode, env?: FileEnvelope): number {
  let fontSize = t.fontSize ?? 12;
  if (env && t.boundVariables?.fontSize) {
    const v = resolveVariableToFloat(env, t.boundVariables.fontSize);
    if (v !== null) fontSize = v;
  }
  const st = linkedTextStyle(t, env);
  if (st?.fontSize !== undefined) fontSize = st.fontSize;
  return fontSize;
}

/** Largest font size on the text node (base + {@link TextNode.styledSegments}). */
export function effectiveTextMaxFontSizePx(t: TextNode, env?: FileEnvelope): number {
  let max = effectiveTextBaseFontSizePx(t, env);
  for (const seg of t.styledSegments ?? []) {
    const fs = seg.style.fontSize;
    if (fs !== undefined && fs > max) max = fs;
  }
  return max;
}

export function leadingTrimCss(leadingTrim?: LeadingTrim): string {
  if (leadingTrim === 'CAP_HEIGHT') {
    return 'text-box-trim:trim-both;text-box-edge:cap alphabetic;';
  }
  return '';
}
