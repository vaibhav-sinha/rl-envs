import { describe, expect, it, vi } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('use_figma in-place rollback', () => {
  it('restores envelope from disk when a mutating script throws', async () => {
    const persistence = new JsonPersistence();
    const engine = new DocumentEngine({ persistence, logger: createConsoleLogger('error') });
    await engine.createEmptyFile({ fileName: 'Rollback' });
    const path = engine.getActiveFilePath()!;
    const before = await persistence.load({ path });

    const run = await runUseFigmaScript(
      `
figma.currentPage.name = 'Mutated';
throw new Error('fail on purpose');
`.trim(),
      engine
    );

    expect(run.kind).toBe('error');
    const after = await persistence.load({ path });
    expect(after.document.children[0]?.name).toBe(before.document.children[0]?.name);
    expect(engine.getActiveFile()?.document.children[0]?.name).toBe(before.document.children[0]?.name);
  });

  it('mutating script does not structuredClone the envelope', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'InPlace' });
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
});
