import type { FontName, TextNode, FileEnvelope, DocumentNode } from '../model/types.js';
import { listLocalFontFaces } from './localFontRegistry.js';
import { collectTextNodeFonts, listFontsUsed } from './collectDocumentFonts.js';
import { getFontAvailability, resolveRenderingFontName } from './fontSubstitution.js';
import { DEFAULT_FONT } from './fontTypes.js';

export { DEFAULT_FONT, listFontsUsed, getFontAvailability, resolveRenderingFontName };
export { collectDocumentFonts } from './collectDocumentFonts.js';
export { collectRenderingFonts } from './fontSubstitution.js';
export {
  getFontFaceCss,
  getLocalFontsFileBaseUrl,
  listLocalFontFaces,
  isFontAvailable,
  getFontMetrics,
  setFontsDirForTests,
} from './localFontRegistry.js';
export { measureTextWidthPx, metricsLineHeightPx, averageCharWidthPx } from './textMetrics.js';

/** Locally installed fonts (from manifest). */
export const BUNDLED_FONTS: FontName[] = listLocalFontFaces();

const loadedFonts = new Set<string>();

function fontKey(f: FontName): string {
  return `${f.family}\0${f.style}`;
}

export function listAvailableFonts(): FontName[] {
  return listLocalFontFaces();
}

/** Always succeeds — agents may use any font; render substitutes at compile time. */
export async function loadFontAsync(fontName: FontName): Promise<void> {
  if (!fontName || typeof fontName.family !== 'string' || typeof fontName.style !== 'string') {
    throw new Error('loadFontAsync: fontName with family and style required');
  }
  loadedFonts.add(fontKey(fontName));
}

/** Figma preloads Inter in the plugin sandbox. */
export function isPreloadedFont(fontName: FontName): boolean {
  return fontName.family === 'Inter';
}

export function isFontLoaded(fontName: FontName): boolean {
  return isPreloadedFont(fontName) || loadedFonts.has(fontKey(fontName));
}

export function resetLoadedFontsForTests(): void {
  loadedFonts.clear();
}

function walkScene(nodes: import('../model/types.js').SceneNode[], out: TextNode[]): void {
  for (const n of nodes) {
    if (n.type === 'TEXT') out.push(n);
    if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
      walkScene(n.children, out);
    }
    if (n.type === 'BOOLEAN_OPERATION') walkScene(n.children as unknown as import('../model/types.js').SceneNode[], out);
  }
}

function walkTextNodes(root: DocumentNode, out: TextNode[]): void {
  for (const page of root.children) {
    walkScene(page.children, out);
  }
}

/** True when any TEXT node references a font not yet loaded via loadFontAsync. */
export function hasMissingFont(envelope: FileEnvelope): boolean {
  const texts: TextNode[] = [];
  walkTextNodes(envelope.document, texts);
  for (const t of texts) {
    for (const fn of collectTextNodeFonts(t)) {
      if (!isFontLoaded(fn)) return true;
    }
  }
  return false;
}

export function fontFamilyCss(fontName: FontName | undefined): string {
  const resolved = resolveRenderingFontName(fontName);
  const family = resolved.family.replace(/'/g, "\\'");
  return `font-family:'${family}',ui-sans-serif,system-ui,sans-serif;`;
}
