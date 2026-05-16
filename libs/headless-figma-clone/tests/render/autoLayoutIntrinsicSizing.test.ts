import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyAutoLayoutIntrinsicSizingDeep,
  syncHugTextLayoutMetricsDeep,
} from '../../src/render/autoLayoutIntrinsicSizing.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope, FrameNode, TextNode } from '../../src/model/types.js';

function findNode(nodes: { id: string; children?: unknown[] }[], id: string): FrameNode | TextNode | null {
  for (const n of nodes) {
    if (n.id === id) return n as FrameNode | TextNode;
    const ch = (n as { children?: { id: string; children?: unknown[] }[] }).children;
    if (ch) {
      const hit = findNode(ch, id);
      if (hit) return hit;
    }
  }
  return null;
}

describe('autoLayoutIntrinsicSizing — exported hug text + parent cross cap', () => {
  it('keeps payment summary row width at 327 when exported text metrics are tighter than heuristic', () => {
    const env = JSON.parse(
      readFileSync(
        'C:/Users/vaibh/.headless-figma-clone/workspace/Coffee-Shop-Mobile-App-Design-Community.hfc.json',
        'utf8'
      )
    ) as FileEnvelope;
    const page = structuredClone(env.document.children.find((p) => p.id === 'I1053')!);
    for (const c of page.children) {
      applyAutoLayoutIntrinsicSizingDeep(c, env);
      syncHugTextLayoutMetricsDeep(c, env);
    }
    const i1172 = findNode(page.children, 'I1172') as FrameNode;
    const i1173 = findNode(page.children, 'I1173') as TextNode;
    const i1174 = findNode(page.children, 'I1174') as TextNode;
    expect(i1173.width).toBe(37);
    expect(i1174.width).toBe(43);
    expect(i1172.width).toBe(327);

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'I1053',
      options: { inlineCss: false, viewportPaddingPx: 0 },
    });
    expect(out.css).toContain('.hfc-node-I1172{');
    expect(out.css).toMatch(/\.hfc-node-I1172\{[^}]*width:327px/);
    expect(out.css).not.toMatch(/\.hfc-node-I1172\{[^}]*width:354px/);
  });

  it('caps a horizontal row to vertical parent inner width when content sum still exceeds', () => {
    const parent: FrameNode = {
      id: 'col',
      name: 'col',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 200,
      height: 80,
      layoutMode: 'VERTICAL',
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'HUG',
      primaryAxisSizingMode: 'HUG',
      counterAxisSizingMode: 'FIXED',
      children: [],
    };
    const row: FrameNode = {
      id: 'row',
      name: 'row',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 200,
      height: 24,
      layoutMode: 'HORIZONTAL',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      itemSpacing: 120,
      children: [
        {
          id: 'a',
          name: 'a',
          type: 'TEXT',
          x: 0,
          y: 0,
          width: 80,
          height: 20,
          characters: 'Label',
          fontSize: 14,
          layoutSizingHorizontal: 'HUG',
          layoutSizingVertical: 'HUG',
          textAutoResize: 'WIDTH_AND_HEIGHT',
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
        },
        {
          id: 'b',
          name: 'b',
          type: 'TEXT',
          x: 0,
          y: 0,
          width: 80,
          height: 20,
          characters: 'Value',
          fontSize: 14,
          layoutSizingHorizontal: 'HUG',
          layoutSizingVertical: 'HUG',
          textAutoResize: 'WIDTH_AND_HEIGHT',
          fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
        },
      ],
    };
    parent.children = [row];
    applyAutoLayoutIntrinsicSizingDeep(parent, undefined, undefined);
    syncHugTextLayoutMetricsDeep(parent);
    expect(row.width).toBe(200);
  });
});
