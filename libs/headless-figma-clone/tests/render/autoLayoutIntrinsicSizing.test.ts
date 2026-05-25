import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyAutoLayoutIntrinsicSizingDeep,
  syncHugTextLayoutMetricsDeep,
} from '../../src/render/autoLayoutIntrinsicSizing.js';
import { measureTextWidthPx } from '../../src/fonts/textMetrics.js';
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
    expect(i1173.width).toBe(39);
    expect(i1174.width).toBe(49);
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
      primaryAxisSizingMode: 'AUTO',
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

  it('hug text width uses glyph metrics narrower than legacy 0.62 heuristic for narrow digits', () => {
    const t: TextNode = {
      id: 't',
      name: 't',
      type: 'TEXT',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      characters: '1111',
      fontSize: 16,
      fontName: { family: 'Inter', style: 'Regular' },
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      textAutoResize: 'WIDTH_AND_HEIGHT',
    };
    const frame: FrameNode = {
      id: 'f',
      name: 'f',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      layoutMode: 'HORIZONTAL',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      children: [t],
    };
    applyAutoLayoutIntrinsicSizingDeep(frame, undefined, undefined);
    syncHugTextLayoutMetricsDeep(frame, undefined, undefined);
    const heuristic = Math.ceil(4 * 16 * 0.62 + Math.ceil(16 * 0.35));
    const metrics = measureTextWidthPx('1111', 16, t.fontName);
    expect(t.width).toBeLessThan(heuristic);
    expect(t.width).toBe(metrics);
  });

  it('sums wrapped row heights for horizontal auto-layout with layoutWrap WRAP', () => {
    const mkCard = (id: string, height: number): FrameNode => ({
      id,
      name: id,
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 156,
      height,
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      children: [],
    });
    const grid: FrameNode = {
      id: 'grid',
      name: 'grid',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 328,
      height: 460,
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      layoutSizingHorizontal: 'FIXED',
      layoutSizingVertical: 'HUG',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'AUTO',
      itemSpacing: 16,
      children: [mkCard('a', 230), mkCard('b', 214), mkCard('c', 214), mkCard('d', 214)],
    };
    const parent: FrameNode = {
      id: 'root',
      name: 'root',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 328,
      height: 488,
      layoutMode: 'VERTICAL',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      itemSpacing: 8,
      children: [
        {
          id: 'header',
          name: 'header',
          type: 'FRAME',
          x: 0,
          y: 0,
          width: 328,
          height: 20,
          layoutMode: 'HORIZONTAL',
          layoutSizingHorizontal: 'FIXED',
          layoutSizingVertical: 'HUG',
          counterAxisSizingMode: 'FIXED',
          children: [],
        },
        grid,
      ],
    };

    applyAutoLayoutIntrinsicSizingDeep(parent, undefined, undefined);
    expect(grid.height).toBe(460);
    expect(parent.height).toBe(488);
  });

  it('excludes visible:false children from vertical hug stack height', () => {
    const desc: FrameNode = {
      id: 'desc',
      name: 'Product Description',
      type: 'FRAME',
      x: 0,
      y: 228,
      width: 220,
      height: 70,
      layoutMode: 'VERTICAL',
      layoutSizingHorizontal: 'FILL',
      layoutSizingVertical: 'HUG',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'FIXED',
      itemSpacing: 8,
      children: [
        {
          id: 'textBlock',
          name: 'textBlock',
          type: 'FRAME',
          x: 0,
          y: 0,
          width: 220,
          height: 70,
          layoutMode: 'VERTICAL',
          layoutSizingVertical: 'HUG',
          primaryAxisSizingMode: 'AUTO',
          itemSpacing: 2,
          children: [
            {
              id: 'brand',
              name: 'Brand',
              type: 'TEXT',
              x: 0,
              y: 0,
              width: 220,
              height: 16,
              characters: 'Brand',
              fontSize: 14,
              fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
            },
          ],
        },
        {
          id: 'atc',
          name: 'Button',
          type: 'FRAME',
          x: 0,
          y: 62,
          width: 220,
          height: 32,
          visible: false,
          layoutMode: 'HORIZONTAL',
          children: [],
        },
      ],
    };
    applyAutoLayoutIntrinsicSizingDeep(desc, undefined, undefined);
    expect(desc.height).toBe(16);
    expect(desc.height).not.toBe(110);
  });

  it('shrinks horizontal badge when only layoutSizingVertical is HUG (status-badge repro)', () => {
    const label: TextNode = {
      id: 'lbl',
      name: 'Delivered',
      type: 'TEXT',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      characters: 'Delivered',
      fontSize: 14,
      fontName: { family: 'Inter', style: 'Regular' },
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      textAutoResize: 'WIDTH_AND_HEIGHT',
    };
    const badge: FrameNode = {
      id: 'badge',
      name: 'Status Badge',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      layoutMode: 'HORIZONTAL',
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 4,
      paddingBottom: 4,
      layoutSizingVertical: 'HUG',
      children: [label],
    };
    const header: FrameNode = {
      id: 'header',
      name: 'Header',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 328,
      height: 100,
      layoutMode: 'HORIZONTAL',
      itemSpacing: 8,
      children: [badge],
    };

    applyAutoLayoutIntrinsicSizingDeep(header, undefined, undefined);
    syncHugTextLayoutMetricsDeep(header, undefined, undefined);

    expect(badge.height).toBeLessThan(50);
    expect(badge.height).not.toBe(100);
    expect(header.height).toBe(100);
  });

  it('shrinks header row when layoutSizingVertical HUG sets counter axis AUTO', () => {
    const label: TextNode = {
      id: 'lbl2',
      name: 'Delivered',
      type: 'TEXT',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      characters: 'Delivered',
      fontSize: 14,
      fontName: { family: 'Inter', style: 'Regular' },
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      textAutoResize: 'WIDTH_AND_HEIGHT',
    };
    const badge: FrameNode = {
      id: 'badge2',
      name: 'Status Badge',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      layoutMode: 'HORIZONTAL',
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 4,
      paddingBottom: 4,
      layoutSizingVertical: 'HUG',
      children: [label],
    };
    const header: FrameNode = {
      id: 'header2',
      name: 'Header',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 328,
      height: 100,
      layoutMode: 'HORIZONTAL',
      layoutSizingVertical: 'HUG',
      itemSpacing: 8,
      children: [badge],
    };

    applyAutoLayoutIntrinsicSizingDeep(header, undefined, undefined);
    syncHugTextLayoutMetricsDeep(header, undefined, undefined);

    expect(badge.height).toBeLessThan(50);
    expect(header.height).toBeLessThan(50);
  });
});
