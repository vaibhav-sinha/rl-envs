import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript page metadata', () => {
  it('serializes page name and type from figma.root.children', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Meta' });

    const run = await runUseFigmaScript(
      `
const pages = figma.root.children.map((p) => ({ id: p.id, name: p.name, type: p.type }));
return { pages, currentPage: { id: figma.currentPage.id, name: figma.currentPage.name, type: figma.currentPage.type } };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const result = run.result as {
      pages: Array<{ id: string; name: string; type: string }>;
      currentPage: { id: string; name: string; type: string };
    };
    expect(result.pages.length).toBeGreaterThan(0);
    for (const page of result.pages) {
      expect(page.id).toMatch(/^I\d+$/);
      expect(typeof page.name).toBe('string');
      expect(page.name.length).toBeGreaterThan(0);
      expect(page.type).toBe('PAGE');
    }
    expect(result.currentPage.type).toBe('PAGE');
    expect(typeof result.currentPage.name).toBe('string');
    expect(result.currentPage.name.length).toBeGreaterThan(0);
  });

  it('returning figma.currentPage directly expands page fields', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Meta' });

    const run = await runUseFigmaScript(`return figma.currentPage;`.trim(), engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const page = run.result as { id: string; type: string; name: string };
    expect(page.type).toBe('PAGE');
    expect(typeof page.name).toBe('string');
    expect(page.name.length).toBeGreaterThan(0);
  });

  it('page rename via RuntimePage.name persists in envelope', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Rename' });

    const run = await runUseFigmaScript(
      `
const p2 = figma.createPage();
p2.name = 'OTP Flow';
return { id: p2.id, name: p2.name, type: p2.type };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    await engine.applyTransaction(run.operations);

    const result = run.result as { id: string; name: string; type: string };
    expect(result).toEqual({ id: expect.any(String), name: 'OTP Flow', type: 'PAGE' });

    const file = engine.getActiveFile()!;
    const page = file.document.children.find((c) => c.type === 'PAGE' && c.id === result.id);
    expect(page?.name).toBe('OTP Flow');
  });
});
