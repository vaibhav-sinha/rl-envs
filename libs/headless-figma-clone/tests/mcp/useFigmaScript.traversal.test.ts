import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript traversal parity', () => {
  it('frame.findAll with predicate excludes the frame itself', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Traverse' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
shell.name = 'Shell';
shell.resize(200, 100);
figma.currentPage.appendChild(shell);
const a = figma.createRectangle();
a.name = 'Target';
a.resize(40, 30);
shell.appendChild(a);
const hits = shell.findAll((n) => n.name === 'Target');
return { shellId: shell.id, hitIds: hits.map((n) => n.id), hitNames: hits.map((n) => n.name) };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as { shellId: string; hitIds: string[]; hitNames: string[] };
    expect(result.hitIds).toHaveLength(1);
    expect(result.hitNames).toEqual(['Target']);
    expect(result.hitIds[0]).not.toBe(result.shellId);
  });

  it('frame.findChildren returns only direct children', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Traverse' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
figma.currentPage.appendChild(shell);
const a = figma.createRectangle();
a.name = 'A';
shell.appendChild(a);
const nested = figma.createFrame();
nested.name = 'Nested';
shell.appendChild(nested);
const b = figma.createRectangle();
b.name = 'B';
nested.appendChild(b);
const kids = shell.findChildren();
return kids.map((n) => n.name).sort();
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual(['A', 'Nested']);
  });

  it('page.findAll with criteria object finds descendants', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Traverse' });

    const run = await runUseFigmaScript(
      `
const r = figma.createRectangle();
r.name = 'OnlyRect';
figma.currentPage.appendChild(r);
const hits = figma.currentPage.findAll({ types: ['RECTANGLE'], name: 'OnlyRect', nameMatch: 'exact' });
return hits.map((n) => n.type);
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual(['RECTANGLE']);
  });
});
