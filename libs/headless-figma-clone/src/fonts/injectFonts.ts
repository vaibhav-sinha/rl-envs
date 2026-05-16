import type { FileEnvelope } from '../model/types.js';
import { collectRenderingFonts } from './fontSubstitution.js';
import { getFontFaceCss } from './localFontRegistry.js';

/** Inject `<style id="hfc-font-faces">` into compiled HTML `<head>`. */
export function injectFontFacesIntoHtml(html: string, baseUrl: string, envelope?: FileEnvelope): string {
  const faces = envelope ? collectRenderingFonts(envelope) : [];
  const css = getFontFaceCss(baseUrl, faces);
  if (!css) return html;

  const styleBlock = `<style id="hfc-font-faces">\n${css}\n</style>`;
  const headClose = html.indexOf('</head>');
  if (headClose >= 0) {
    return `${html.slice(0, headClose)}${styleBlock}${html.slice(headClose)}`;
  }
  return styleBlock + html;
}
