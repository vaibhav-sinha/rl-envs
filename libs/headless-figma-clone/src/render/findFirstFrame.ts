import type { DocumentNode } from '../model/types.js';

/** First top-level FRAME on the first PAGE that has frames (child order = reading order). */
export function findFirstFrameId(document: DocumentNode): string | null {
  for (const page of document.children) {
    const first = page.children[0];
    if (first) return first.id;
  }
  return null;
}
