import type { DocumentNode, FileEnvelope, FontName, SceneNode, TextNode } from '../model/types.js';
import { DEFAULT_FONT } from './fontTypes.js';

function addFont(map: Map<string, FontName>, fontName: FontName | undefined): void {
  const fn = fontName ?? DEFAULT_FONT;
  map.set(fontKey(fn), fn);
}

function fontKey(fn: FontName): string {
  return `${fn.family}\0${fn.style}`;
}

/** Fonts used by a TEXT node (node-level + styled segments in optional character range). */
export function collectTextNodeFonts(t: TextNode, start = 0, end?: number): FontName[] {
  const endIdx = end ?? t.characters.length;
  const map = new Map<string, FontName>();
  addFont(map, t.fontName);
  for (const seg of t.styledSegments ?? []) {
    if (seg.end <= start || seg.start >= endIdx) continue;
    if (seg.style.fontName) addFont(map, seg.style.fontName);
  }
  return [...map.values()];
}

function walkScene(nodes: SceneNode[], out: Map<string, FontName>): void {
  for (const n of nodes) {
    if (n.type === 'TEXT') {
      const t = n as TextNode;
      addFont(out, t.fontName);
      for (const seg of t.styledSegments ?? []) {
        if (seg.style.fontName) addFont(out, seg.style.fontName);
      }
    }
    if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
      walkScene(n.children, out);
    }
    if (n.type === 'BOOLEAN_OPERATION') {
      walkScene(n.children as unknown as SceneNode[], out);
    }
  }
}

function walkTextNodes(root: DocumentNode, out: Map<string, FontName>): void {
  for (const page of root.children) {
    walkScene(page.children, out);
  }
}

/** Unique fonts referenced by TEXT nodes in the document. */
export function collectDocumentFonts(envelope: FileEnvelope): FontName[] {
  const map = new Map<string, FontName>();
  walkTextNodes(envelope.document, map);
  return [...map.values()];
}

export function listFontsUsed(envelope: FileEnvelope): FontName[] {
  return collectDocumentFonts(envelope);
}
