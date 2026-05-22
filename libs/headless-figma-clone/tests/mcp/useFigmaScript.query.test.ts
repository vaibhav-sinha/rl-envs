import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript node.query', () => {
  it('query finds descendants by type and name attribute', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Query' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
shell.name = 'Shell';
figma.currentPage.appendChild(shell);
const a = figma.createRectangle();
a.name = 'Target';
shell.appendChild(a);
const b = figma.createRectangle();
b.name = 'Other';
shell.appendChild(b);
const hits = shell.query('RECTANGLE[name=Target]');
return { count: hits.length, names: hits.map((n) => n.name) };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as { count: number; names: string[] };
    expect(result.count).toBe(1);
    expect(result.names).toEqual(['Target']);
  });

  it('query supports child combinator and QueryResult.first()', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'QueryComb' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
figma.currentPage.appendChild(shell);
const nested = figma.createFrame();
nested.name = 'Nested';
shell.appendChild(nested);
const inner = figma.createRectangle();
inner.name = 'Inner';
nested.appendChild(inner);
const direct = shell.query('> RECTANGLE');
const scoped = nested.query('> RECTANGLE').first();
return {
  directCount: direct.length,
  scopedName: scoped?.name ?? null,
};
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ directCount: 0, scopedName: 'Inner' });
  });

  it('query().set() batch-updates matched nodes', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'QuerySet' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
figma.currentPage.appendChild(shell);
const a = figma.createRectangle();
a.name = 'A';
shell.appendChild(a);
const b = figma.createRectangle();
b.name = 'B';
shell.appendChild(b);
shell.query('RECTANGLE').set({ opacity: 0.25 });
return shell.query('RECTANGLE').values(['name', 'opacity']);
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const rows = run.result as Array<{ name: string; opacity: number }>;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.opacity === 0.25)).toBe(true);
  });

  it('matches returns true only for matching nodes', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Matches' });

    const run = await runUseFigmaScript(
      `
const hit = figma.createRectangle();
hit.name = 'Label';
figma.currentPage.appendChild(hit);
const miss = figma.createFrame();
figma.currentPage.appendChild(miss);
return {
  hit: hit.matches('RECTANGLE[name=Label]'),
  miss: miss.matches('RECTANGLE[name=Label]'),
};
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ hit: true, miss: false });
  });
});
