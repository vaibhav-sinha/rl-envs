import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-section-parity-'));
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

describe('useFigmaScript SectionNode parity', () => {
  it('section.resizeWithoutConstraints updates width and height', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
const section = figma.createSection();
figma.currentPage.appendChild(section);
section.resizeWithoutConstraints(820, 640);
return { width: section.width, height: section.height, id: section.id };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const { id, width, height } = run.result as { id: string; width: number; height: number };
      expect(width).toBe(820);
      expect(height).toBe(640);
      const live = findEnvelopeNode(engine.getActiveFile()!, id);
      expect(live?.type).toBe('SECTION');
      if (live?.type === 'SECTION') {
        expect(live.width).toBe(820);
        expect(live.height).toBe(640);
      }
    });
  });

  it('component set exposes resizeWithoutConstraints', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
const a = figma.createComponent();
const b = figma.createComponent();
figma.currentPage.appendChild(a);
figma.currentPage.appendChild(b);
const cs = figma.combineAsVariants([a, b], figma.currentPage);
cs.resizeWithoutConstraints(300, 200);
return {
  hasMethod: typeof cs.resizeWithoutConstraints === 'function',
  width: cs.width,
  height: cs.height,
  id: cs.id,
};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { hasMethod: boolean; width: number; height: number; id: string };
      expect(r.hasMethod).toBe(true);
      expect(r.width).toBe(300);
      expect(r.height).toBe(200);
    });
  });

  it('frame does not expose resizeWithoutConstraints', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
const frame = figma.createFrame();
return { hasMethod: typeof frame.resizeWithoutConstraints === 'function' };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      expect((run.result as { hasMethod: boolean }).hasMethod).toBe(false);
    });
  });

  it('section strokes and stub fields round-trip on handles', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
const section = figma.createSection();
figma.currentPage.appendChild(section);
section.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
section.strokeWeight = 2;
section.locked = true;
section.devStatus = { type: 'READY_FOR_DEV', description: 'stub' };
section.sectionContentsHidden = true;
return {
  id: section.id,
  strokeWeight: section.strokeWeight,
  locked: section.locked,
  devStatus: section.devStatus,
  sectionContentsHidden: section.sectionContentsHidden,
};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as {
        id: string;
        strokeWeight: number;
        locked: boolean;
        devStatus: { type: string; description?: string };
        sectionContentsHidden: boolean;
      };
      expect(r.strokeWeight).toBe(2);
      expect(r.locked).toBe(true);
      expect(r.devStatus).toEqual({ type: 'READY_FOR_DEV', description: 'stub' });
      expect(r.sectionContentsHidden).toBe(true);

      const live = findEnvelopeNode(engine.getActiveFile()!, r.id);
      expect(live?.type).toBe('SECTION');
      if (live?.type === 'SECTION') {
        expect(live.strokeWeight).toBe(2);
        expect(live.locked).toBe(true);
        expect(live.devStatus).toEqual({ type: 'READY_FOR_DEV', description: 'stub' });
        expect(live.sectionContentsHidden).toBe(true);
      }

      const compiled = designCompiler.compileSubtree({
        envelope: engine.getActiveFile()!,
        rootNodeId: r.id,
        options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      });
      expect(compiled.html + compiled.css).toMatch(/border:\s*2px\s+solid/i);
    });
  });
});
