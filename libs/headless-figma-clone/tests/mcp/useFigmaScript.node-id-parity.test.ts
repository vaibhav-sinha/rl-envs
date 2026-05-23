import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-id-parity-'));
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

describe('useFigmaScript node.id parity (Figma Plugin API)', () => {
  it('exposes node.id on create* before appendChild', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'IdParity' });
      const run = await runUseFigmaScript(
        `
const shell = figma.createAutoLayout('VERTICAL', { name: 'Sale' });
const label = figma.createText();
shell.appendChild(label);
return { shellId: shell.id, labelId: label.id };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const { shellId, labelId } = run.result as { shellId: string; labelId: string };
      expect(shellId).toMatch(/^I\d+$/);
      expect(labelId).toMatch(/^I\d+$/);
      expect(shellId).not.toBe(labelId);
    });
  });

  it('getNodeById returns null for detached nodes, then resolves after append', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Lookup' });
      const run = await runUseFigmaScript(
        `
const r = figma.createRectangle();
const before = figma.getNodeById(r.id);
figma.currentPage.appendChild(r);
const after = figma.getNodeById(r.id);
return {
  id: r.id,
  beforeNull: before === null,
  afterType: after ? after.type : null,
};
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      expect(run.result).toEqual({
        id: expect.stringMatching(/^I\d+$/),
        beforeNull: true,
        afterType: 'RECTANGLE',
      });
    });
  });

  it('commits createNode with the reserved id from create*', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Reserved' });
      const run = await runUseFigmaScript(
        `
const f = figma.createFrame();
const reserved = f.id;
figma.currentPage.appendChild(f);
return { reserved, lookup: figma.getNodeById(reserved) !== null };
`.trim(),
        engine
      );
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const { reserved } = run.result as { reserved: string; lookup: boolean };
      const create = run.operations.find((o) => o.op === 'createNode' && o.node.type === 'FRAME');
      expect(create?.op === 'createNode' && create.nodeId).toBe(reserved);
    });
  });
});
