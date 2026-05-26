import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine, findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { commitScriptRun } from '../helpers/commitScriptRun.js';
import type { TextNode } from '../../src/model/types.js';

const LONG_COPY =
  "Hi! I'm Sarah from Oker Support. I can see your order #OKR-28491 — how can I help you today?";

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-text-parity-'));
  const prev = process.env.HFC_WORKSPACE_DIR;
  process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
  return (async () => {
    try {
      return await fn();
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

describe('TEXT resize Figma parity', () => {
  it('HEIGHT + resize(w, t.height) grows to multiple lines', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'TextParity' });

      const run = await runUseFigmaScript(
        `
const t = figma.createText();
t.fontSize = 14;
t.fontName = { family: 'Inter', style: 'Regular' };
t.textAutoResize = 'HEIGHT';
t.characters = ${JSON.stringify(LONG_COPY)};
t.resize(236, t.height);
return { height: t.height, width: t.width, layoutSizingVertical: t.layoutSizingVertical };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as {
        height: number;
        width: number;
        layoutSizingVertical: string;
      };
      expect(r.width).toBe(236);
      expect(r.layoutSizingVertical).toBe('HUG');
      expect(r.height).toBeGreaterThan(24);
    });
  });

  it('HEIGHT resize compiles with pre-wrap (no single-line clip CSS)', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'TextCompile' });

      const run = await runUseFigmaScript(
        `
const frame = figma.createFrame();
frame.layoutMode = 'VERTICAL';
frame.resize(360, 400);
const t = figma.createText();
t.fontSize = 14;
t.fontName = { family: 'Inter', style: 'Regular' };
t.textAutoResize = 'HEIGHT';
frame.appendChild(t);
t.characters = ${JSON.stringify(LONG_COPY)};
t.resize(280, t.height);
figma.currentPage.appendChild(frame);
return { textId: t.id };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const tx = await commitScriptRun(engine, run);
      expect(tx.success).toBe(true);
      const file = engine.getActiveFile()!;
      const textId = (run.result as { textId: string }).textId;
      const live = findEnvelopeNode(file, textId) as TextNode;
      expect(live.height).toBeGreaterThan(30);
      expect(live.layoutSizingVertical).toBe('HUG');

      const out = designCompiler.compileSubtree({
        envelope: file,
        rootNodeId: textId,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(out.html).toMatch(/white-space:pre-wrap/);
      expect(out.html).not.toMatch(/white-space:pre;overflow:hidden/);
    });
  });

  it('NONE resize keeps FIXED sizing', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'TextNone' });

      const run = await runUseFigmaScript(
        `
const t = figma.createText();
t.fontSize = 14;
t.textAutoResize = 'NONE';
t.characters = 'Fixed';
t.resize(80, 24);
return {
  layoutSizingHorizontal: t.layoutSizingHorizontal,
  layoutSizingVertical: t.layoutSizingVertical,
  width: t.width,
  height: t.height,
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as Record<string, unknown>;
      expect(r.layoutSizingHorizontal).toBe('FIXED');
      expect(r.layoutSizingVertical).toBe('FIXED');
      expect(r.width).toBe(80);
      expect(r.height).toBe(24);
    });
  });

  it('TEXT in auto-layout bubble hugs wrapped height', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'TextBubble' });

      const run = await runUseFigmaScript(
        `
const screen = figma.createAutoLayout('VERTICAL', { width: 360, height: 400 });
const bubble = figma.createAutoLayout('VERTICAL', {
  name: 'Bubble',
  paddingTop: 10,
  paddingBottom: 10,
  paddingLeft: 12,
  paddingRight: 12,
  cornerRadius: 16,
});
screen.appendChild(bubble);
bubble.layoutSizingHorizontal = 'HUG';
const body = figma.createText();
body.fontSize = 14;
body.fontName = { family: 'Inter', style: 'Regular' };
body.textAutoResize = 'HEIGHT';
bubble.appendChild(body);
body.characters = ${JSON.stringify(LONG_COPY)};
body.resize(236, body.height);
figma.currentPage.appendChild(screen);
return { bubbleHeight: bubble.height, bodyHeight: body.height };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { bubbleHeight: number; bodyHeight: number };
      expect(r.bodyHeight).toBeGreaterThan(28);
      expect(r.bubbleHeight).toBeGreaterThan(r.bodyHeight);
    });
  });
});
