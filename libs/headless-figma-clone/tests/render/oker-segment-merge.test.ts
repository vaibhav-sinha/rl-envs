import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FrameNode, InstanceNode } from '../../src/model/types.js';
import { applyInstanceAppearanceToRoot } from '../../src/render/instanceAppearance.js';
import { mergeDetachedChildrenIntoRoot } from '../../src/render/instanceMerge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const okerDesignPath = join(
  __dirname,
  '../../../../envs/figma-design/tasks/oker-create-sale-section/environment/design.hfc.json'
);

function findNodeById(node: { id?: string; children?: unknown[] }, id: string): unknown {
  if (node.id === id) return node;
  for (const ch of node.children ?? []) {
    const hit = findNodeById(ch as { id?: string; children?: unknown[] }, id);
    if (hit) return hit;
  }
  return undefined;
}

describe('oker SegmentedControl detached merge', () => {
  it('clears Selected master slot paints when detached Default segment has empty fills', () => {
    const envelope = JSON.parse(readFileSync(okerDesignPath, 'utf8'));
    const segInst = findNodeById(envelope.document, 'I9725') as InstanceNode;
    const segRoot = structuredClone(findNodeById(envelope.document, 'I48862')) as FrameNode;
    const warnings: string[] = [];
    mergeDetachedChildrenIntoRoot(segRoot, segInst.children ?? [], { warnings });
    const inspiration = segRoot.children[0] as InstanceNode;
    const shop = segRoot.children[1] as InstanceNode;
    expect(inspiration.id).toBe('I48863');
    expect(inspiration.fills).toEqual([]);
    expect(inspiration.componentProperties?.State).toEqual({ type: 'VARIANT', value: 'Default' });
    expect(shop.fills?.[0]?.type).toBe('SOLID');
  });

  it('does not apply Selected shell paints onto Default variant root after merge', () => {
    const envelope = JSON.parse(readFileSync(okerDesignPath, 'utf8'));
    const segInst = findNodeById(envelope.document, 'I9725') as InstanceNode;
    const segRoot = structuredClone(findNodeById(envelope.document, 'I48862')) as FrameNode;
    mergeDetachedChildrenIntoRoot(segRoot, segInst.children ?? [], { warnings: [] });
    const inspiration = segRoot.children[0] as InstanceNode;
    const defaultRoot = structuredClone(findNodeById(envelope.document, 'I48853')) as FrameNode;
    applyInstanceAppearanceToRoot(defaultRoot, { ...inspiration });
    expect(inspiration.fills).toEqual([]);
    expect(defaultRoot.fills).toEqual([]);
  });
});
