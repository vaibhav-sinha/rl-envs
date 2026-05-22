import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('useFigmaScript Figma API parity fixes', () => {
  it('figma.root.findAll searches across pages', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'RootFindAll' });

    const run = await runUseFigmaScript(
      `
const r = figma.createRectangle();
r.name = 'GlobalRect';
figma.currentPage.appendChild(r);
const page2 = figma.createPage();
page2.name = 'Other';
const r2 = figma.createRectangle();
r2.name = 'OnOtherPage';
page2.appendChild(r2);
const hits = figma.root.findAll((n) => n.name === 'GlobalRect' || n.name === 'OnOtherPage');
return {
  count: hits.length,
  names: hits.map((n) => n.name).sort(),
};
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ count: 2, names: ['GlobalRect', 'OnOtherPage'] });
  });

  it('loadFontAsync accepts fonts not in local manifest', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Fonts' });

    const run = await runUseFigmaScript(
      `
await figma.loadFontAsync({ family: 'Barlow', style: 'Regular' });
const t = figma.createText();
t.fontName = { family: 'Barlow', style: 'Regular' };
t.characters = 'ok';
return 'loaded';
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    expect(run.result).toBe('loaded');
  });

  it('listAvailableFontsAsync returns { fontName } entries', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'FontList' });

    const run = await runUseFigmaScript(
      `
const fonts = await figma.listAvailableFontsAsync();
return fonts.slice(0, 3).map((f) => ({
  hasWrapper: f.fontName !== undefined,
  family: f.fontName.family,
}));
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const rows = run.result as Array<{ hasWrapper: boolean; family: string }>;
    expect(rows.every((r) => r.hasWrapper && typeof r.family === 'string')).toBe(true);
  });

  it('getNodeById TEXT handle exposes getStyledTextSegments', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'TextSeg' });

    const run = await runUseFigmaScript(
      `
const t = figma.createText();
t.characters = 'Hello';
t.fontSize = 14;
figma.currentPage.appendChild(t);
const viaId = figma.getNodeById(t.id);
const segs = viaId.getStyledTextSegments(['fontSize']);
return { len: segs.length, fontSize: segs[0].fontSize };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ len: 1, fontSize: 14 });
  });

  it('primaryAxisSizingMode accepts AUTO and rejects HUG', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'Axis' });

    const okRun = await runUseFigmaScript(
      `
const f = figma.createAutoLayout();
f.primaryAxisSizingMode = 'AUTO';
return f.primaryAxisSizingMode;
`.trim(),
      engine
    );
    expect(okRun.kind).toBe('ok');
    expect(okRun.result).toBe('AUTO');

    const badRun = await runUseFigmaScript(
      `
const f = figma.createFrame();
f.layoutMode = 'VERTICAL';
f.primaryAxisSizingMode = 'HUG';
return 'bad';
`.trim(),
      engine
    );
    expect(badRun.kind).toBe('error');
    if (badRun.kind === 'error') {
      expect(badRun.message).toContain('must be FIXED or AUTO');
    }
  });

  it('attached INSTANCE accepts primaryAxisSizingMode via set', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'InstanceAxis' });

    const run = await runUseFigmaScript(
      `
const frame = figma.createFrame();
frame.layoutMode = 'VERTICAL';
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);
const inst = figma.createInstance(comp);
inst.layoutMode = 'VERTICAL';
figma.currentPage.appendChild(inst);
inst.primaryAxisSizingMode = 'AUTO';
return inst.primaryAxisSizingMode;
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toBe('AUTO');
  });
});
