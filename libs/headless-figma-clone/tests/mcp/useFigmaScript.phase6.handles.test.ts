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

  it('handle patch queues updateNode and remove queues deleteNode', async () => {
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
return { id: r.id };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const updates = run.operations.filter((o) => o.op === 'updateNode');
      expect(updates.some((o) => o.op === 'updateNode' && o.patch.strokeAlign === 'OUTSIDE')).toBe(true);
      expect(run.operations.some((o) => o.op === 'deleteNode')).toBe(true);
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
