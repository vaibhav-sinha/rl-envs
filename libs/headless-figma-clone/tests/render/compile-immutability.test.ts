import { describe, expect, it } from 'vitest';
import type { SceneNode } from '../../src/model/types.js';
import {
  compileSaleSectionWithOverlay,
  getOkerSaleSectionRootId,
  loadOkerEngine,
  loadOkerEnvelope,
} from '../helpers/okerSaleSection.js';

function findSceneNode(nodes: SceneNode[], id: string): SceneNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const ch =
      n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP' || n.type === 'SECTION'
        ? n.children
        : n.type === 'BOOLEAN_OPERATION'
          ? (n.children as unknown as SceneNode[])
          : null;
    if (ch) {
      const hit = findSceneNode(ch, id);
      if (hit) return hit;
    }
  }
  return null;
}

function layoutSnapshot(n: SceneNode): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: n.id,
    type: n.type,
  };
  if ('width' in n) base.width = n.width;
  if ('height' in n) base.height = n.height;
  if (n.type === 'FRAME') {
    base.layoutSizingHorizontal = n.layoutSizingHorizontal;
    base.layoutSizingVertical = n.layoutSizingVertical;
  }
  if (n.type === 'TEXT') {
    base.characters = n.characters;
  }
  const ch =
    n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP' || n.type === 'SECTION'
      ? n.children
      : n.type === 'BOOLEAN_OPERATION'
        ? (n.children as unknown as SceneNode[])
        : null;
  if (ch?.length) {
    base.children = ch.map(layoutSnapshot);
  }
  return base;
}

describe('compile immutability (overlay path)', () => {
  it('does not mutate activeFile layout fields after overlay compile', async () => {
    const { engine, cleanup } = await loadOkerEngine();
    try {
      const file = engine.getActiveFile()!;
      const rootId = getOkerSaleSectionRootId(file);
      const rootBefore = findSceneNode(
        file.document.children.flatMap((p) => p.children),
        rootId
      )!;
      const before = layoutSnapshot(rootBefore);
      const graphBefore = engine.getGraphIndexes();
      compileSaleSectionWithOverlay(file, rootId, engine.getGraphIndexes());
      const rootAfter = findSceneNode(
        file.document.children.flatMap((p) => p.children),
        rootId
      )!;
      const after = layoutSnapshot(rootAfter);
      expect(after).toEqual(before);
      expect(engine.getGraphIndexes()).toBe(graphBefore);
    } finally {
      cleanup();
    }
  });

  it('does not mutate detached envelope copy used only for reference', () => {
    const envelope = loadOkerEnvelope();
    const rootId = getOkerSaleSectionRootId(envelope);
    const root = findSceneNode(envelope.document.children.flatMap((p) => p.children), rootId)!;
    const before = structuredClone(root);
    compileSaleSectionWithOverlay(envelope, rootId);
    const after = findSceneNode(envelope.document.children.flatMap((p) => p.children), rootId)!;
    expect(layoutSnapshot(after)).toEqual(layoutSnapshot(before));
  });
});
