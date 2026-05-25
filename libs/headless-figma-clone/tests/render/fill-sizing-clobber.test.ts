import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import {
  applyAutoLayoutIntrinsicSizingDeep,
  syncHugTextLayoutMetricsDeep,
} from '../../src/render/autoLayoutIntrinsicSizing.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope, FrameNode, TextNode } from '../../src/model/types.js';
import { createConsoleLogger } from '../../src/util/logger.js';

/** Reproduces oker order-details expandable section: FILL column in horizontal header. */
function buildExpandableHeaderFixture(): FrameNode {
  const title: TextNode = {
    id: 'title',
    name: 'Title',
    type: 'TEXT',
    x: 0,
    y: 0,
    width: 98,
    height: 17,
    characters: 'Delivery address',
    fontSize: 14,
    layoutSizingHorizontal: 'FILL',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true, opacity: 1 }],
  };
  const preview: TextNode = {
    id: 'preview',
    name: 'Preview',
    type: 'TEXT',
    x: 0,
    y: 0,
    width: 97,
    height: 15,
    characters: 'Home · Mumbai',
    fontSize: 12,
    layoutSizingHorizontal: 'FILL',
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 }, visible: true, opacity: 1 }],
  };
  const left: FrameNode = {
    id: 'left',
    name: 'Left',
    type: 'FRAME',
    x: 0,
    y: 0,
    width: 100,
    height: 36,
    layoutMode: 'VERTICAL',
    layoutSizingHorizontal: 'FILL',
    layoutSizingVertical: 'HUG',
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED',
    itemSpacing: 4,
    children: [title, preview],
  };
  const chevron: TextNode = {
    id: 'chevron',
    name: 'Chevron',
    type: 'TEXT',
    x: 0,
    y: 0,
    width: 18,
    height: 22,
    characters: '›',
    fontSize: 18,
    layoutSizingHorizontal: 'HUG',
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 }, visible: true, opacity: 1 }],
  };
  return {
    id: 'header',
    name: 'Section header',
    type: 'FRAME',
    x: 0,
    y: 0,
    width: 328,
    height: 54,
    layoutMode: 'HORIZONTAL',
    primaryAxisAlignItems: 'SPACE_BETWEEN',
    counterAxisAlignItems: 'CENTER',
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 16,
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
    children: [left, chevron],
  };
}

describe('FILL layout sizing (oker order-details repro)', () => {
  it('applyAutoLayoutIntrinsicSizingDeep preserves child layoutSizingHorizontal FILL', () => {
    const header = buildExpandableHeaderFixture();
    expect((header.children[0] as FrameNode).layoutSizingHorizontal).toBe('FILL');

    applyAutoLayoutIntrinsicSizingDeep(header, undefined, undefined);
    syncHugTextLayoutMetricsDeep(header, undefined, undefined);

    expect((header.children[0] as FrameNode).layoutSizingHorizontal).toBe('FILL');
  });

  it('compile emits flex-grow for FILL left column, not flex:0 0 100px', () => {
    const header = buildExpandableHeaderFixture();
    applyAutoLayoutIntrinsicSizingDeep(header, undefined, undefined);
    syncHugTextLayoutMetricsDeep(header, undefined, undefined);

    const env: FileEnvelope = {
      schemaVersion: 1,
      document: {
        id: 'doc',
        type: 'DOCUMENT',
        name: 'doc',
        children: [
          {
            id: 'page',
            type: 'PAGE',
            name: 'Page',
            children: [header],
          },
        ],
      },
    };

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: 'header',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const bundle = out.html + out.css;
    expect(bundle).toMatch(/\.hfc-node-left\{[^}]*flex:\s*1\s+1/);
    expect(bundle).not.toMatch(/\.hfc-node-left\{[^}]*flex:\s*0\s+0\s+100px/);
  });

  it('script expandable section keeps FILL through append and resize', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-fill-expand-'));
    const prev = process.env.HFC_WORKSPACE_DIR;
    process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
    try {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'fill-expand' });
      const run = await runUseFigmaScript(
        `
const card = figma.createFrame();
card.name = 'Card';
card.resize(328, 200);
card.layoutMode = 'VERTICAL';
figma.currentPage.appendChild(card);

const header = figma.createFrame();
header.name = 'Section header';
header.layoutMode = 'HORIZONTAL';
header.primaryAxisAlignItems = 'SPACE_BETWEEN';
header.counterAxisAlignItems = 'CENTER';
header.paddingTop = 16;
header.paddingBottom = 16;
header.paddingLeft = 16;
header.paddingRight = 16;
card.appendChild(header);

const left = figma.createFrame();
left.name = 'Left';
left.layoutMode = 'VERTICAL';
left.itemSpacing = 4;
header.appendChild(left);
left.layoutSizingHorizontal = 'FILL';

const title = figma.createText();
title.characters = 'Price breakup';
title.fontSize = 14;
left.appendChild(title);

const preview = figma.createText();
preview.characters = 'Subtotal · Taxes';
preview.fontSize = 12;
left.appendChild(preview);

const chevron = figma.createText();
chevron.characters = '›';
chevron.fontSize = 18;
header.appendChild(chevron);

const expanded = figma.createFrame();
expanded.name = 'Expanded content';
expanded.layoutMode = 'VERTICAL';
expanded.itemSpacing = 8;
expanded.layoutSizingHorizontal = 'FILL';
card.appendChild(expanded);
expanded.resize(expanded.width, 80);

return {
  leftSizing: left.layoutSizingHorizontal,
  expandedSizing: expanded.layoutSizingHorizontal,
  leftId: left.id,
  headerId: header.id,
};
`,
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const tx = await engine.applyTransaction(run.operations);
      expect(tx.success).toBe(true);
      expect((run.result as { leftSizing?: string }).leftSizing).toBe('FILL');
      expect((run.result as { expandedSizing?: string }).expandedSizing).toBe('FILL');

      const env = structuredClone(engine.getActiveFile()!) as FileEnvelope;
      for (const op of run.operations) applyEngineOp(env, op);
      const leftId = (run.result as { leftId?: string }).leftId!;
      const headerId = (run.result as { headerId?: string }).headerId!;

      const page = env.document.children[0]!;
      const card = page.children[0] as FrameNode;
      const header = card.children.find((c) => c.id === headerId) as FrameNode;
      const left = header.children.find((c) => c.id === leftId) as FrameNode;
      expect(left.layoutSizingHorizontal).toBe('FILL');

      const out = designCompiler.compileSubtree({
        envelope: env,
        rootNodeId: card.id,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(out.html + out.css).toMatch(new RegExp(`\\.hfc-node-${leftId}\\{[^}]*flex:\\s*1\\s+1`));
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  });
});
