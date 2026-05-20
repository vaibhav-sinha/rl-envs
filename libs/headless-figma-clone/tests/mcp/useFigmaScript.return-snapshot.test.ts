import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript return snapshot', () => {
  it('returning a handle expands name, type, and geometry', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Snap' });

    const run = await runUseFigmaScript(
      `
const r = figma.createRectangle();
r.name = 'SnapRect';
r.resize(88, 44);
r.x = 12;
r.y = 8;
figma.currentPage.appendChild(r);
return r;
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as {
      id: string;
      type: string;
      name: string;
      width: number;
      height: number;
      x: number;
      y: number;
    };
    expect(result.type).toBe('RECTANGLE');
    expect(result.name).toBe('SnapRect');
    expect(result.width).toBe(88);
    expect(result.height).toBe(44);
    expect(result.x).toBe(12);
    expect(result.y).toBe(8);
    expect(result.id).toMatch(/^I\d+$/);
  });

  it('returning page.children expands each child', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Snap' });

    const run = await runUseFigmaScript(
      `
const a = figma.createRectangle();
a.name = 'A';
figma.currentPage.appendChild(a);
const b = figma.createEllipse();
b.name = 'B';
figma.currentPage.appendChild(b);
return figma.currentPage.children;
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as Array<{ type: string; name: string }>;
    expect(result).toHaveLength(2);
    const names = result.map((n) => n.name).sort();
    expect(names).toEqual(['A', 'B']);
    expect(result.every((n) => typeof n.type === 'string')).toBe(true);
  });

  it('returning figma.currentPage includes page metadata', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Snap' });

    const run = await runUseFigmaScript(
      `
return figma.currentPage;
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as { id: string; type: string; name: string };
    expect(result.type).toBe('PAGE');
    expect(typeof result.name).toBe('string');
    expect(result.name.length).toBeGreaterThan(0);
  });

  it('returning nested frame includes expanded children', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Snap' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
shell.name = 'Shell';
figma.currentPage.appendChild(shell);
const inner = figma.createRectangle();
inner.name = 'Inner';
shell.appendChild(inner);
return shell;
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as {
      name: string;
      children?: Array<{ name: string; type: string }>;
    };
    expect(result.name).toBe('Shell');
    expect(result.children).toHaveLength(1);
    expect(result.children![0]).toMatchObject({ name: 'Inner', type: 'RECTANGLE' });
  });
});
