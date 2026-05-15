import type { FontName, TextNode, FileEnvelope, DocumentNode } from '../model/types.js';

/** Bundled deterministic font catalog (no Figma cloud). */
export const BUNDLED_FONTS: FontName[] = [
  { family: 'Inter', style: 'Regular' },
  { family: 'Inter', style: 'Medium' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Inter', style: 'Bold' },
  { family: 'Roboto', style: 'Regular' },
  { family: 'Roboto', style: 'Bold' },
  { family: 'Arial', style: 'Regular' },
  { family: 'Helvetica', style: 'Regular' },
];

const loadedFonts = new Set<string>();

function fontKey(f: FontName): string {
  return `${f.family}\0${f.style}`;
}

export function listAvailableFonts(): FontName[] {
  return [...BUNDLED_FONTS];
}

export async function loadFontAsync(fontName: FontName): Promise<void> {
  const hit = BUNDLED_FONTS.find((f) => f.family === fontName.family && f.style === fontName.style);
  if (!hit) {
    throw new Error(`Font not available: ${fontName.family} ${fontName.style}`);
  }
  loadedFonts.add(fontKey(fontName));
}

export function isFontLoaded(fontName: FontName): boolean {
  return loadedFonts.has(fontKey(fontName));
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
    const fn = t.fontName ?? { family: 'Inter', style: 'Regular' };
    if (!isFontLoaded(fn)) return true;
  }
  return false;
}

export function fontFamilyCss(fontName: FontName | undefined): string {
  const family = fontName?.family ?? 'Inter';
  return `font-family:'${family.replace(/'/g, "\\'")}',ui-sans-serif,system-ui,sans-serif;`;
}
