import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript MCP parity APIs', () => {
  it('shared plugin data round-trips in memory', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'PluginData' });

    const run = await runUseFigmaScript(
      `
const r = figma.createRectangle();
figma.currentPage.appendChild(r);
r.setSharedPluginData('ns', 'key', 'value');
return {
  value: r.getSharedPluginData('ns', 'key'),
  keys: r.getSharedPluginDataKeys('ns'),
};
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ value: 'value', keys: ['key'] });
  });

  it('getPluginData throws with guidance', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'NoPluginData' });

    const run = await runUseFigmaScript(
      `
const r = figma.createRectangle();
figma.currentPage.appendChild(r);
try {
  r.getPluginData('k');
  return { threw: false };
} catch (e) {
  return { threw: true, message: String(e.message || e) };
}
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as { threw: boolean; message: string };
    expect(result.threw).toBe(true);
    expect(result.message).toContain('getSharedPluginData');
  });

  it('placeholder can be set and cleared without error', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Placeholder' });

    const run = await runUseFigmaScript(
      `
const f = figma.createFrame();
figma.currentPage.appendChild(f);
f.placeholder = true;
const on = f.placeholder;
f.placeholder = false;
const off = f.placeholder;
return { frameId: f.id, on, off };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as { frameId: string; on: boolean; off: boolean };
    expect(result.on).toBe(true);
    expect(result.off).toBe(false);
    expect(run.placeholderNodeIds).toEqual([]);
  });

  it('placeholder=true is reported in placeholderNodeIds', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'PlaceholderOn' });

    const run = await runUseFigmaScript(
      `
const f = figma.createFrame();
figma.currentPage.appendChild(f);
f.placeholder = true;
return f.id;
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.placeholderNodeIds).toContain(run.result);
  });

  it('figma.io.write queues json and binary outputs', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'IoWrite' });

    const run = await runUseFigmaScript(
      `
figma.io.write('out/report.json', JSON.stringify({ ok: true }));
figma.io.write('tiles/tile.png', new Uint8Array([137, 80, 78, 71]));
return { count: 2 };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.ioWrites).toHaveLength(2);
    expect(run.ioWrites[0]?.path).toBe('out/report.json');
    expect(run.ioWrites[0]?.mimeType).toBe('application/json');
    expect(run.ioWrites[1]?.path).toBe('tiles/tile.png');
    expect(run.ioWrites[1]?.mimeType).toBe('image/png');
  });

  it('node.screenshot queues capture requests', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Screenshot' });

    const run = await runUseFigmaScript(
      `
const f = figma.createFrame();
f.resize(120, 80);
figma.currentPage.appendChild(f);
await f.screenshot();
return { frameId: f.id };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const frameId = (run.result as { frameId: string }).frameId;
    expect(run.screenshotQueue).toEqual([{ nodeId: frameId, contentsOnly: undefined, scale: undefined }]);
  });

  it('figma.root.query searches the document', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'RootQuery' });

    const run = await runUseFigmaScript(
      `
const r = figma.createRectangle();
r.name = 'RootHit';
figma.currentPage.appendChild(r);
const hits = figma.root.query('RECTANGLE[name=RootHit]');
return { count: hits.length };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ count: 1 });
  });

  it('detached frame supports set() before append', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DetachedSet' });

    const run = await runUseFigmaScript(
      `
const card = figma.createAutoLayout('VERTICAL', { name: 'Card', itemSpacing: 8 });
card.set({ opacity: 0.75, itemSpacing: 12 });
const parent = figma.createFrame();
figma.currentPage.appendChild(parent);
parent.appendChild(card);
return { name: card.name, itemSpacing: card.itemSpacing, opacity: card.opacity };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toMatchObject({ name: 'Card', itemSpacing: 12, opacity: 0.75 });
  });
});
