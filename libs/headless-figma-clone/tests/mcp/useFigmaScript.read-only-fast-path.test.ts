import { describe, expect, it, vi } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('use_figma read-only fast path', () => {
  it('runUseFigmaScript returns empty operations for read-only code', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Read' });

    const run = await runUseFigmaScript(
      `return { count: figma.currentPage.children.length };`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.operations).toEqual([]);
  });

  it('does not structuredClone the envelope for read-only scripts', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Read' });
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone');

    const run = await runUseFigmaScript(
      `return { name: figma.currentPage.name, n: figma.root.children.length };`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    expect(cloneSpy).not.toHaveBeenCalled();
    cloneSpy.mockRestore();
  });

  it('mutating script does not structuredClone the envelope', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Write' });
    const activeBefore = engine.getActiveFile();
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone');

    const run = await runUseFigmaScript(
      `
figma.currentPage.name = 'Renamed';
return figma.currentPage.name;
`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    expect(cloneSpy).not.toHaveBeenCalled();
    expect(engine.getActiveFile()).toBe(activeBefore);
    cloneSpy.mockRestore();
  });

  it('DocumentEngine.applyTransaction is not required for read-only scripts', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Read' });
    const spy = vi.spyOn(engine, 'applyTransaction');

    const run = await runUseFigmaScript(
      `return { name: figma.currentPage.name };`.trim(),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind === 'ok') expect(run.operations).toHaveLength(0);
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
