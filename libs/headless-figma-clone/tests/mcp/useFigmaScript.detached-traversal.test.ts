import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('useFigmaScript detached traversal (Figma parity)', () => {
  it('findAll on detached frame finds nested descendants before page append', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DetachedTraverse' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
shell.name = 'Shell';
const nested = figma.createFrame();
nested.name = 'Nested';
const target = figma.createRectangle();
target.name = 'Target';
nested.appendChild(target);
shell.appendChild(nested);
const hits = shell.findAll((n) => n.name === 'Target');
return { count: hits.length, names: hits.map((n) => n.name) };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ count: 1, names: ['Target'] });
  });

  it('findChildren and children on detached frame return only direct pending kids', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DetachedTraverse' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
const a = figma.createRectangle();
a.name = 'A';
const nested = figma.createFrame();
nested.name = 'Nested';
const b = figma.createRectangle();
b.name = 'B';
nested.appendChild(b);
shell.appendChild(a);
shell.appendChild(nested);
const kids = shell.findChildren();
const childProp = shell.children.map((n) => n.name).sort();
return { kids: kids.map((n) => n.name).sort(), childProp };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ kids: ['A', 'Nested'], childProp: ['A', 'Nested'] });
  });

  it('findOne and findAllWithCriteria work on detached frame', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DetachedTraverse' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
const only = figma.createRectangle();
only.name = 'OnlyRect';
shell.appendChild(only);
const one = shell.findOne((n) => n.type === 'RECTANGLE');
const crit = shell.findAllWithCriteria({ types: ['RECTANGLE'], name: 'OnlyRect', nameMatch: 'exact' });
return { oneName: one?.name ?? null, critLen: crit.length };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ oneName: 'OnlyRect', critLen: 1 });
  });

  it('findAll on detached frame includes subtrees referenced by document id', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DetachedTraverse' });

    const run = await runUseFigmaScript(
      `
const onPage = figma.createFrame();
onPage.name = 'OnPageRoot';
figma.currentPage.appendChild(onPage);
const deep = figma.createRectangle();
deep.name = 'DeepRect';
onPage.appendChild(deep);

const shell = figma.createFrame();
shell.appendChild(onPage);
const hits = shell.findAll((n) => n.name === 'DeepRect');
return { count: hits.length };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ count: 1 });
  });

  it('transform group supports detached findAll', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DetachedTraverse' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
const group = figma.createTransformGroup();
const label = figma.createText();
label.characters = 'Hi';
label.name = 'Label';
group.appendChild(label);
shell.appendChild(group);
const texts = shell.findAll((n) => n.type === 'TEXT');
return { textCount: texts.length };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect((run.result as { textCount: number }).textCount).toBe(1);
  });

  it('still records command success in issues flow after detached findAll', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DetachedTraverse' });

    const run = await runUseFigmaScript(
      `
const shell = figma.createFrame();
const t = figma.createRectangle();
t.name = 'T';
shell.appendChild(t);
shell.findAll((n) => n.name === 'T');
figma.currentPage.appendChild(shell);
return { ok: true };
`.trim(),
      engine
    );

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ ok: true });
    expect(run.operations.some((o) => o.op === 'createNode')).toBe(true);
  });

  it('findOne on detached createInstance resolves main component subtree', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'hfc-detached-inst-'));
    const hfcPath = join(tmp, 'demo.hfc.json');
    copyFileSync(join(__dirname, '../fixtures/phase5-demo.hfc.json'), hfcPath);

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.loadFromDisk({ absolutePath: hfcPath });

    const run = await runUseFigmaScript(
      `
const inst = figma.createInstance('COMP1');
const hit = inst.findOne((n) => n.type === 'TEXT');
const queryHit = inst.query('TEXT').first();
return {
  findOneName: hit?.name ?? null,
  queryName: queryHit?.name ?? null,
};
`.trim(),
      engine
    );

    rmSync(tmp, { recursive: true, force: true });

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect(run.result).toEqual({ findOneName: 'label', queryName: 'label' });
  });
});
