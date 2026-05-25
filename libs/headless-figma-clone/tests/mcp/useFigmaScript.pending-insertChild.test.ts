import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-pending-ic-'));
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

describe('useFigmaScript — detached pending insertChild reorder', () => {
  it('insertChild on detached parent reorders pending children without duplicating', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'pending-ic' });
      const run = await runUseFigmaScript(
        `
const P = figma.createFrame();
const C1 = figma.createFrame(); C1.name = 'C1';
const C2 = figma.createFrame(); C2.name = 'C2';
const C3 = figma.createFrame(); C3.name = 'C3';
P.appendChild(C1);
P.appendChild(C2);
P.appendChild(C3);
const before = P.children.map((c) => c.name);
P.insertChild(0, C3);
const after = P.children.map((c) => c.name);
return { before, after, count: P.children.length };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      expect(run.result).toEqual({
        before: ['C1', 'C2', 'C3'],
        after: ['C3', 'C1', 'C2'],
        count: 3,
      });
    });
  });

  it('figma-order script: detached build, insertChild, then page.appendChild succeeds', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'pending-ic-attach' });
      const run = await runUseFigmaScript(
        `
const page = figma.currentPage;
const P = figma.createFrame();
P.layoutMode = 'VERTICAL';
P.itemSpacing = 20;
const C1 = figma.createFrame(); C1.name = 'C1'; C1.resize(100, 200);
const C2 = figma.createFrame(); C2.name = 'C2'; C2.resize(100, 100);
const C3 = figma.createFrame(); C3.name = 'C3'; C3.resize(100, 300);
P.appendChild(C1);
P.appendChild(C2);
P.appendChild(C3);
P.insertChild(0, C3);
page.appendChild(P);
return {
  order: P.children.map((c) => c.name),
  pageChildCount: page.children.length,
};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      expect(run.result).toEqual({
        order: ['C3', 'C1', 'C2'],
        pageChildCount: 1,
      });

      const tx =
        run.preApplied && run.committedWorking
          ? await engine.commitEnvelope(run.committedWorking, { touchedNodeIds: run.touchedNodeIds })
          : await engine.applyTransaction(run.operations);
      expect(tx.success).toBe(true);
      if (!tx.success) return;

      const page = engine.getActiveFile()?.document.children.find((c) => c.type === 'PAGE');
      const p = page && 'children' in page ? page.children[0] : undefined;
      expect(p && 'children' in p ? p.children.map((c) => c.name) : []).toEqual(['C3', 'C1', 'C2']);
    });
  });
});
