import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { afterAll, describe, expect, it } from 'vitest';
import { applyEngineOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { injectFontFacesIntoHtml } from '../../src/fonts/injectFonts.js';
import { getLocalFontsFileBaseUrl } from '../../src/fonts/localFontRegistry.js';
import { designCompiler, HFC_UA_RESET_CSS } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import type { FileEnvelope, FrameNode, SceneNode, TextNode } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const script = readFileSync(
  join(__dirname, '../../verification/scenarios/106-mail-split-inbox/script.js'),
  'utf8'
);

function findText(
  env: FileEnvelope,
  pred: (t: TextNode) => boolean
): TextNode | null {
  let found: TextNode | null = null;
  function walk(nodes: SceneNode[]): void {
    for (const n of nodes) {
      if (n.type === 'TEXT' && pred(n as TextNode)) found = n as TextNode;
      if ('children' in n && Array.isArray((n as { children: SceneNode[] }).children)) {
        walk((n as { children: SceneNode[] }).children);
      }
    }
  }
  for (const p of env.document.children) walk(p.children);
  return found;
}

function findParentFrame(env: FileEnvelope, childId: string): FrameNode | null {
  let found: FrameNode | null = null;
  function walk(nodes: SceneNode[], parent: FrameNode | null): void {
    for (const n of nodes) {
      if (n.id === childId && parent) found = parent;
      if ('children' in n && Array.isArray((n as { children: SceneNode[] }).children)) {
        walk((n as { children: SceneNode[] }).children, n.type === 'FRAME' ? (n as FrameNode) : parent);
      }
    }
  }
  for (const p of env.document.children) walk(p.children, null);
  return found;
}

describe('scenario 106 mail split inbox — single-line clip + hug text flex', () => {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  afterAll(async () => {
    await browser?.close();
  });

  it('body copy clips on one line; sidebar preview lines stay tight', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: '106' });
    const run = await runUseFigmaScript(script, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const env = structuredClone(engine.getActiveFile()!) as FileEnvelope;
    for (const op of run.operations) applyEngineOp(env, op);
    const rootId = (run.result as { rootId: string }).rootId;

    const body = findText(env, (t) => t.characters.startsWith('Hey team'));
    const sasha = findText(env, (t) => t.characters === 'Sasha');
    const previewSub = findText(env, (t) => t.characters === 'Re: Launch checklist' && t.fontSize === 10);
    const previewLine = findText(env, (t) => t.characters.startsWith('Let us lock assets'));
    const subject = findText(env, (t) => t.characters.startsWith('Re: Launch checklist — assets'));
    expect(body).toBeTruthy();
    expect(sasha).toBeTruthy();
    expect(previewSub).toBeTruthy();
    expect(previewLine).toBeTruthy();
    expect(subject).toBeTruthy();
    if (!body || !sasha || !previewSub || !previewLine || !subject) return;
    const midFrame = findParentFrame(env, previewLine.id);
    expect(midFrame?.layoutMode).toBe('VERTICAL');
    expect(midFrame?.height).toBe(40);
    if (!midFrame) return;

    const out = designCompiler.compileSubtree({
      envelope: env,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    const bundle = out.css;

    expect(bundle).toMatch(new RegExp(`\\.hfc-node-${body.id}\\{[^}]*white-space:pre`));
    expect(bundle).toMatch(new RegExp(`\\.hfc-node-${body.id}\\{[^}]*width:472px`));
    expect(bundle).toMatch(new RegExp(`\\.hfc-node-${body.id}\\{[^}]*flex:0 0 14px`));
    expect(bundle).toMatch(new RegExp(`\\.hfc-node-${sasha.id}\\{[^}]*white-space:pre`));
    expect(bundle).toMatch(new RegExp(`\\.hfc-node-${previewSub.id}\\{[^}]*color:rgba\\(89,97,115,1\\)`));
    expect(bundle).toContain('line-height:13px');
    expect(bundle).toMatch(new RegExp(`\\.hfc-node-${subject.id}\\{[^}]*text-overflow:clip`));

    browser ??= await chromium.launch();
    const page = await browser.newPage();
    const shell = injectFontFacesIntoHtml(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${HFC_UA_RESET_CSS}\n${out.css}</style></head><body>${out.html}</body></html>`,
      getLocalFontsFileBaseUrl(),
      env
    );
    await page.setContent(shell, { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready');

    const bodyLines = await page.evaluate((id) => {
      const el = document.querySelector(`.hfc-node-${id} .hfc-text-inner span`);
      if (!el) return null;
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getClientRects().length;
    }, body.id);
    expect(bodyLines).toBe(1);

    const gap = await page.evaluate(
      ({ sashaId, subId }) => {
        const a = document.querySelector(`.hfc-node-${sashaId}`)?.getBoundingClientRect();
        const b = document.querySelector(`.hfc-node-${subId}`)?.getBoundingClientRect();
        if (!a || !b) return null;
        return { gap: b.top - a.bottom, aH: a.height, bH: b.height };
      },
      { sashaId: sasha.id, subId: previewSub.id }
    );
    expect(gap?.aH).toBe(14);
    expect(gap?.bH).toBe(13);
    expect(gap?.gap ?? 0).toBeGreaterThanOrEqual(1);
    expect(gap?.gap ?? 0).toBeLessThanOrEqual(3);

    const preview = await page.evaluate(
      ({ midId, lineIds }) => {
        const mid = document.querySelector(`.hfc-node-${midId}`)?.getBoundingClientRect();
        const lines = lineIds.map((id) => {
          return document.querySelector(`.hfc-node-${id} span`)?.textContent ?? '';
        });
        const lastId = lineIds[lineIds.length - 1]!;
        const lastNode = document.querySelector(`.hfc-node-${lastId}`)?.getBoundingClientRect();
        return {
          lines,
          thirdLineBottom: lastNode?.bottom,
          midBottom: mid?.bottom,
        };
      },
      {
        midId: midFrame.id,
        lineIds: [sasha.id, previewSub.id, previewLine.id],
      }
    );
    expect(preview?.lines[2]).toContain('Let us lock assets');
    expect(
      (preview?.thirdLineBottom ?? 0) <= (preview?.midBottom ?? 0) + 5,
      `preview bottom ${String(preview?.thirdLineBottom)} vs mid ${String(preview?.midBottom)}`
    ).toBe(true);

    await page.close();
  });
});
