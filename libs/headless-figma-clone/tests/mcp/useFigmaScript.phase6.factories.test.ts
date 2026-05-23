import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { commitScriptRun } from '../helpers/commitScriptRun.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-p6f-'));
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

describe('useFigmaScript Phase 6 — factories', () => {
  it('createPolygon / createStar / createEllipse / createLine append with expected defaults', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'F' });
      const run = await runUseFigmaScript(
        `
const f = figma.createFrame();
figma.currentPage.appendChild(f);
const poly = figma.createPolygon();
poly.pointCount = 8;
f.appendChild(poly);
const star = figma.createStar();
star.pointCount = 6;
star.innerRadius = 0.4;
f.appendChild(star);
const ell = figma.createEllipse();
ell.arcData = { startingAngle: 0, endingAngle: 3.14, innerRadius: 0 };
f.appendChild(ell);
const line = figma.createLine();
line.resize(120, 0);
f.appendChild(line);
return { ok: true };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const applied = await commitScriptRun(engine, run);
      expect(applied.success).toBe(true);
      const creates = run.operations.filter((o) => o.op === 'createNode');
      const polySpec = creates.find((c) => c.op === 'createNode' && c.node.type === 'POLYGON');
      expect(polySpec?.op === 'createNode' && polySpec.node.type === 'POLYGON' && polySpec.node.pointCount).toBe(8);
      const starSpec = creates.find((c) => c.op === 'createNode' && c.node.type === 'STAR');
      expect(
        starSpec?.op === 'createNode' &&
          starSpec.node.type === 'STAR' &&
          starSpec.node.pointCount === 6 &&
          starSpec.node.innerRadius === 0.4
      ).toBe(true);
    });
  });

  it('createTable(rows, cols) sizes grid', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'T' });
      const run = await runUseFigmaScript(
        `
const t = figma.createTable(3, 4);
figma.currentPage.appendChild(t);
return {};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const tOp = run.operations.find((o) => o.op === 'createNode' && o.node.type === 'TABLE');
      expect(tOp?.op === 'createNode' && tOp.node.type === 'TABLE').toBe(true);
      if (tOp?.op === 'createNode' && tOp.node.type === 'TABLE') {
        expect(tOp.node.rowCount).toBe(3);
        expect(tOp.node.columnCount).toBe(4);
        expect(tOp.node.cells?.length).toBe(12);
      }
    });
  });

  it('createAutoLayout applies props object (direction + props or props-only)', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'AL' });
      const run = await runUseFigmaScript(
        `
const peach = { type: 'SOLID', color: { r: 1, g: 0.92, b: 0.88 } };
const column = figma.createAutoLayout('VERTICAL', {
  name: 'Sale - Bundle Deals',
  itemSpacing: 12,
  paddingTop: 20,
  fills: [{ type: 'SOLID', color: peach.color }],
});
const card = figma.createAutoLayout({ name: 'Card', itemSpacing: 16 });
figma.currentPage.appendChild(column);
figma.currentPage.appendChild(card);
return { columnName: column.name, cardName: card.name };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      await commitScriptRun(engine, run);
      const frames = run.operations
        .filter((o) => o.op === 'createNode' && o.node.type === 'FRAME')
        .map((o) => (o.op === 'createNode' ? o.node : null));
      const column = frames.find((n) => n?.name === 'Sale - Bundle Deals');
      const card = frames.find((n) => n?.name === 'Card');
      expect(column?.layoutMode).toBe('VERTICAL');
      expect(column?.itemSpacing).toBe(12);
      expect(column?.paddingTop).toBe(20);
      expect(column?.fills).toEqual([{ type: 'SOLID', color: { r: 1, g: 0.92, b: 0.88 } }]);
      expect(card?.layoutMode).toBe('HORIZONTAL');
      expect(card?.itemSpacing).toBe(16);
    });
  });

  it('createFrame and createAutoLayout default to white fill (Figma parity)', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'F' });
      const run = await runUseFigmaScript(
        `
const frame = figma.createFrame();
const row = figma.createAutoLayout();
figma.currentPage.appendChild(frame);
frame.appendChild(row);
return {};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      await commitScriptRun(engine, run);
      const white = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      const frames = run.operations
        .filter((o) => o.op === 'createNode' && o.node.type === 'FRAME')
        .map((o) => (o.op === 'createNode' ? o.node.fills : undefined));
      expect(frames).toEqual([white, white]);
    });
  });

  it('createPage appends PAGE under DOCUMENT', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'P' });
      const before = engine.getActiveFile()!.document.children.filter((c) => c.type === 'PAGE').length;
      const run = await runUseFigmaScript(
        `
figma.createPage();
return {};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      await commitScriptRun(engine, run);
      const after = engine.getActiveFile()!.document.children.filter((c) => c.type === 'PAGE').length;
      expect(after).toBe(before + 1);
    });
  });
});
