import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-p6h-'));
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

describe('useFigmaScript Phase 6 — handles', () => {
  it('getNodeById returns null for unknown id', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
return { n: figma.getNodeById('I99999') };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      expect(run.result).toEqual({ n: null });
    });
  });

  it('handle patch queues updateNode and remove detaches from parent', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
const r = figma.createRectangle();
figma.currentPage.appendChild(r);
const h = figma.getNodeById(r.id);
h.strokeAlign = 'OUTSIDE';
h.remove();
return { id: r.id, removed: h.removed, stillOnPage: figma.getNodeById(r.id) === null };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const updates = run.operations.filter((o) => o.op === 'updateNode');
      expect(updates.some((o) => o.op === 'updateNode' && o.patch.strokeAlign === 'OUTSIDE')).toBe(true);
      expect((run.result as { removed: boolean }).removed).toBe(true);
      expect((run.result as { stillOnPage: boolean }).stillOnPage).toBe(true);
      expect(run.operations.some((o) => o.op === 'deleteNode')).toBe(false);
    });
  });

  it('remove then insertChild on another parent reattaches (agent reparent pattern)', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
const outer = figma.createFrame();
outer.name = 'Outer';
outer.resize(400, 400);
figma.currentPage.appendChild(outer);

const inner = figma.createFrame();
inner.name = 'Inner';
inner.resize(200, 100);
outer.appendChild(inner);

const sibling = figma.createFrame();
sibling.name = 'Sibling';
sibling.resize(200, 50);
outer.appendChild(sibling);

inner.remove();
outer.insertChild(0, inner);

return {
  parentId: inner.parent.id,
  parentName: inner.parent.name,
  childNames: outer.children.map((c) => c.name),
  removed: inner.removed,
};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const result = run.result as {
        parentId: string;
        parentName: string;
        childNames: string[];
        removed: boolean;
      };
      expect(result.removed).toBe(false);
      expect(result.parentName).toBe('Outer');
      expect(result.childNames).toEqual(['Inner', 'Sibling']);
    });
  });

  it('getNodeById remove then insertChild reattaches (oker agent step 18 pattern)', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const setup = await runUseFigmaScript(
        `
const scroll = figma.createFrame();
scroll.name = 'Scroll';
scroll.resize(360, 800);
figma.currentPage.appendChild(scroll);

const content = figma.createFrame();
content.name = 'Content';
content.resize(360, 400);
scroll.appendChild(content);

const sale = figma.createAutoLayout('VERTICAL', { name: 'Sale Bundles Section' });
sale.resize(328, 100);
content.appendChild(sale);

return { scrollId: scroll.id, contentId: content.id, saleId: sale.id };
`.trim(),
        engine
      );
      expect(setup.kind).toBe('ok');
      if (setup.kind !== 'ok') return;
      const ids = setup.result as { scrollId: string; contentId: string; saleId: string };

      const tx =
        setup.preApplied && setup.committedWorking
          ? await engine.commitEnvelope(setup.committedWorking, {
              touchedNodeIds: setup.touchedNodeIds,
            })
          : await engine.applyTransaction(setup.operations);
      expect(tx.success).toBe(true);
      if (!tx.success) return;

      const reparent = await runUseFigmaScript(
        `
const saleSection = await figma.getNodeByIdAsync('${ids.saleId}');
const scrollParent = await figma.getNodeByIdAsync('${ids.scrollId}');
const contentParent = await figma.getNodeByIdAsync('${ids.contentId}');

saleSection.remove();
const idx = scrollParent.children.indexOf(contentParent);
scrollParent.insertChild(idx + 1, saleSection);

return {
  saleParentId: saleSection.parent.id,
  removed: saleSection.removed,
};
`.trim(),
        engine
      );
      expect(reparent.kind).toBe('ok');
      if (reparent.kind !== 'ok') return;
      const result = reparent.result as { saleParentId: string; removed: boolean };
      expect(result.removed).toBe(false);
      expect(result.saleParentId).toBe(ids.scrollId);
    });
  });

  it('mutate after delete throws UNKNOWN_NODE', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'H' });
      const run = await runUseFigmaScript(
        `
const r = figma.createRectangle();
figma.currentPage.appendChild(r);
const h = figma.getNodeById(r.id);
h.remove();
h.x = 1;
`.trim(),
        engine
      );
      expect(run.kind).toBe('error');
      if (run.kind === 'error') {
        expect(run.errorCode).toBe('UNKNOWN_NODE');
      }
    });
  });
});
