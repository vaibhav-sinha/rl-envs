import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript current page session', () => {
  it('persists setCurrentPageAsync across script runs via engine', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Pages' });

    const setup = await runUseFigmaScript(
      `
const p2 = figma.createPage();
p2.name = 'Page 2';
await figma.setCurrentPageAsync(p2);
const f = figma.createFrame();
f.name = 'OnPage2';
f.resize(80, 40);
figma.currentPage.appendChild(f);
return { pageId: p2.id, frameId: f.id };
`.trim(),
      engine
    );
    expect(setup.kind).toBe('ok');
    if (setup.kind !== 'ok') return;
    await engine.applyTransaction(setup.operations);
    engine.setCurrentPageId(setup.currentPageId);

    const second = await runUseFigmaScript(
      `
const f = figma.createRectangle();
f.name = 'AlsoOnPage2';
f.resize(20, 20);
figma.currentPage.appendChild(f);
return figma.currentPage.id;
`.trim(),
      engine
    );
    expect(second.kind).toBe('ok');
    if (second.kind !== 'ok') return;
    await engine.applyTransaction(second.operations);
    engine.setCurrentPageId(second.currentPageId);

    const file = engine.getActiveFile()!;
    const page2 = file.document.children.find((c) => c.type === 'PAGE' && c.name === 'Page 2');
    expect(page2).toBeTruthy();
    const names = page2!.children.map((c) => c.name);
    expect(names).toContain('OnPage2');
    expect(names).toContain('AlsoOnPage2');
    expect(engine.getCurrentPageId()).toBe(page2!.id);
  });
});
