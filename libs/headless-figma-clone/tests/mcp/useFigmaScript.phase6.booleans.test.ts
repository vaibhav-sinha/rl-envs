import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-p6b-'));
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

describe('useFigmaScript Phase 6 — booleans', () => {
  it('figma.subtract creates BOOLEAN_OPERATION and reparents operands', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'B' });
      const run = await runUseFigmaScript(
        `
const f = figma.createFrame();
figma.currentPage.appendChild(f);
const a = figma.createRectangle();
const b = figma.createRectangle();
f.appendChild(a);
f.appendChild(b);
const bool = figma.subtract([a, b], f);
return { boolId: bool.id };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const kinds = run.operations.map((o) => o.op);
      expect(kinds).toContain('createNode');
      expect(kinds.filter((k) => k === 'moveNode').length).toBeGreaterThanOrEqual(2);
      const boolCreate = run.operations.find(
        (o) => o.op === 'createNode' && o.node.type === 'BOOLEAN_OPERATION'
      );
      expect(boolCreate?.op === 'createNode' && boolCreate.node.type === 'BOOLEAN_OPERATION').toBe(true);
      if (boolCreate?.op === 'createNode' && boolCreate.node.type === 'BOOLEAN_OPERATION') {
        expect(boolCreate.node.booleanOperation).toBe('SUBTRACT');
      }
    });
  });
});
