import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-inst-'));
  const prev = process.env.HFC_WORKSPACE_DIR;
  process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
  return (async () => {
    try {
      return await fn();
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

describe('useFigmaScript instance parity', () => {
  it('getNodeById resolves nested instance override children with type and name', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Inst' });

      const run = await runUseFigmaScript(
        `
const frame = figma.createFrame();
frame.resize(200, 120);
const title = figma.createText();
title.characters = 'Hello';
title.fontSize = 14;
frame.appendChild(title);
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);

const inst = figma.createInstance(comp);
inst.x = 10;
inst.y = 10;
figma.currentPage.appendChild(inst);

const childIds = inst.children.map((c) => c.id);
const first = figma.getNodeById(childIds[0]);
return {
  childIds,
  hasChildrenIn: 'children' in inst,
  firstType: first?.type,
  firstName: first?.name,
  firstChars: first?.type === 'TEXT' ? first.characters : undefined,
  childIdsDistinctFromMaster: childIds.every((id) => id !== title.id),
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as {
        childIds: string[];
        hasChildrenIn: boolean;
        firstType: string;
        firstName: string;
        firstChars: string;
        childIdsDistinctFromMaster: boolean;
      };
      expect(r.hasChildrenIn).toBe(true);
      expect(r.childIds.length).toBeGreaterThan(0);
      expect(r.firstType).toBe('TEXT');
      expect(r.firstName).toBeTruthy();
      expect(r.firstChars).toBe('Hello');
      expect(r.childIdsDistinctFromMaster).toBe(true);
    });
  });

  it('clone duplicates a frame sibling', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Clone' });

      const run = await runUseFigmaScript(
        `
const f = figma.createFrame();
f.name = 'Original';
figma.currentPage.appendChild(f);
const copy = f.clone();
return { orig: f.id, copy: copy.id, copyName: copy.name, hasClone: typeof f.clone === 'function' };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { orig: string; copy: string; copyName: string; hasClone: boolean };
      expect(r.hasClone).toBe(true);
      expect(r.copy).not.toBe(r.orig);
      expect(r.copyName).toBe('Original');
      expect(run.operations.some((o) => o.op === 'duplicateNode')).toBe(true);
    });
  });

  it('getMainComponentAsync and setProperties on button-style instance', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Props' });

      const run = await runUseFigmaScript(
        `
const shell = figma.createFrame();
shell.resize(120, 48);
const label = figma.createText();
label.characters = 'Go';
label.fontSize = 14;
shell.appendChild(label);
figma.currentPage.appendChild(shell);
const comp = figma.createComponentFromNode(shell);
comp.componentPropertyDefinitions = {
  'Text#1:0': { type: 'TEXT', defaultValue: 'Go' },
};

const inst = figma.createInstance(comp);
figma.currentPage.appendChild(inst);
const main = await inst.getMainComponentAsync();
const hasMain = main !== null;
inst.setProperties({ Text: 'Stop' });
const textProp = inst.componentProperties['Text#1:0'];
return { hasMain, mainId: main?.id, textValue: textProp?.value };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { hasMain: boolean; mainId: string; textValue: string };
      expect(r.hasMain).toBe(true);
      expect(r.textValue).toBe('Stop');
    });
  });

  it('importComponentByKeyAsync resolves local component', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Key' });

      const run = await runUseFigmaScript(
        `
const f = figma.createFrame();
figma.currentPage.appendChild(f);
const comp = figma.createComponentFromNode(f);
const patch = { componentKey: 'test-key-local' };
figma.getNodeById(comp.id); // ensure attached
const h = figma.getNodeById(comp.id);
// componentKey is stored on envelope via update when set on handle
h.componentKey = 'test-key-local';
const imported = await figma.importComponentByKeyAsync('test-key-local');
return { importedId: imported.id, same: imported.id === comp.id };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { importedId: string; same: boolean };
      expect(r.same).toBe(true);
    });
  });

  it('detachInstance keeps same handle id and allows appendChild without reassignment', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'DetachParity' });

      const run = await runUseFigmaScript(
        `
const shell = figma.createFrame();
shell.resize(120, 48);
const label = figma.createText();
label.characters = 'Row';
label.fontSize = 14;
shell.appendChild(label);
figma.currentPage.appendChild(shell);
const comp = figma.createComponentFromNode(shell);

const inst = figma.createInstance(comp);
inst.x = 0;
inst.y = 0;
figma.currentPage.appendChild(inst);
const beforeId = inst.id;
inst.detachInstance();
const afterId = inst.id;
const box = figma.createRectangle();
box.resize(8, 8);
inst.appendChild(box);
return {
  sameId: beforeId === afterId,
  childCount: inst.children.length,
  lastChildType: inst.children[inst.children.length - 1]?.type,
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as {
        sameId: boolean;
        childCount: number;
        lastChildType: string;
      };
      expect(r.sameId).toBe(true);
      expect(r.childCount).toBeGreaterThan(1);
      expect(r.lastChildType).toBe('RECTANGLE');
    });
  });

  it('setProperties on nested INSTANCE from findOne inside parent instance', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'NestedSetProps' });

      const run = await runUseFigmaScript(
        `
const outer = figma.createFrame();
outer.resize(160, 48);
const label = figma.createText();
label.characters = 'Row';
label.fontSize = 12;
outer.appendChild(label);

const innerShell = figma.createFrame();
innerShell.resize(20, 20);
innerShell.name = '_Variants/Checkbox-Radio';
figma.currentPage.appendChild(innerShell);
const innerComp = figma.createComponentFromNode(innerShell);
innerComp.componentPropertyDefinitions = {
  'Active?': { type: 'VARIANT', defaultValue: 'Yes', variantOptions: ['Yes', 'No'] },
  'State': { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default'] },
  'Checkbox vs Radio': { type: 'VARIANT', defaultValue: 'Checkbox', variantOptions: ['Checkbox'] },
};

const innerInst = innerComp.createInstance();
innerInst.name = '_Variants/Checkbox-Radio';
outer.appendChild(innerInst);

figma.currentPage.appendChild(outer);
const rowComp = figma.createComponentFromNode(outer);

const row = rowComp.createInstance();
figma.currentPage.appendChild(row);

const cb = row.findOne(n => n.name === '_Variants/Checkbox-Radio');
const hasSetProperties = typeof cb?.setProperties;
if (hasSetProperties === 'function') {
  cb.setProperties({ 'Active?': 'No' });
}

return {
  hasSetProperties,
  active: cb?.componentProperties?.['Active?']?.value,
  cbType: cb?.type,
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as {
        hasSetProperties: string;
        active: string;
        cbType: string;
      };
      expect(r.hasSetProperties).toBe('function');
      expect(r.cbType).toBe('INSTANCE');
      expect(r.active).toBe('No');
    });
  });

  it('clone instance then setProperties keeps children', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'CloneProps' });

      const run = await runUseFigmaScript(
        `
const shell = figma.createFrame();
shell.resize(120, 48);
const label = figma.createText();
label.characters = 'Go';
label.fontSize = 14;
shell.appendChild(label);
figma.currentPage.appendChild(shell);
const comp = figma.createComponentFromNode(shell);
comp.componentPropertyDefinitions = {
  'Text#1:0': { type: 'TEXT', defaultValue: 'Go' },
};

const inst = figma.createInstance(comp);
figma.currentPage.appendChild(inst);
const row = inst.clone();
const before = row.children.length;
row.setProperties({ Text: 'Stop' });
const after = row.children.length;
return { before, after, textValue: row.componentProperties['Text#1:0']?.value };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { before: number; after: number; textValue: string };
      expect(r.before).toBeGreaterThan(0);
      expect(r.after).toBe(r.before);
      expect(r.textValue).toBe('Stop');
    });
  });

  it('mainComponent is non-null when master exists only in components[] sidecar', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-sidecar-main-'));
    const ws = join(base, 'ws');
    const designPath = join(ws, 'design.hfc.json');
    const prev = process.env.HFC_WORKSPACE_DIR;
    process.env.HFC_WORKSPACE_DIR = ws;
    try {
      mkdirSync(ws, { recursive: true });
      const envelope = {
        schemaVersion: 1,
        fileKey: 'sidecar-test',
        fileName: 'sidecar-test',
        nextInternalId: 200,
        document: {
          id: 'I1',
          type: 'DOCUMENT',
          name: 'Doc',
          children: [
            {
              id: 'I2',
              type: 'PAGE',
              name: 'Page 1',
              x: 0,
              y: 0,
              width: 1,
              height: 1,
              children: [
                {
                  id: 'I60',
                  type: 'INSTANCE',
                  name: 'SidecarInst',
                  x: 0,
                  y: 0,
                  width: 40,
                  height: 20,
                  mainComponentId: 'I50',
                  children: [
                    {
                      id: 'I62',
                      type: 'FRAME',
                      name: 'Detached',
                      x: 0,
                      y: 0,
                      width: 40,
                      height: 20,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        components: [
          {
            id: 'I50',
            name: 'SidecarButton',
            root: {
              id: 'I51',
              type: 'FRAME',
              name: 'Master',
              x: 0,
              y: 0,
              width: 40,
              height: 20,
              children: [
                {
                  id: 'I52',
                  type: 'RECTANGLE',
                  name: 'Box',
                  x: 0,
                  y: 0,
                  width: 10,
                  height: 10,
                },
              ],
            },
          },
        ],
      };
      writeFileSync(designPath, JSON.stringify(envelope));

      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.loadFromDisk({ absolutePath: designPath, save: false });

      const run = await runUseFigmaScript(
        `
const inst = await figma.getNodeByIdAsync('I60');
const main = inst.mainComponent;
return { hasMain: main !== null, mainId: main?.id, mainName: main?.name };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const r = run.result as { hasMain: boolean; mainId: string; mainName: string };
      expect(r.hasMain).toBe(true);
      expect(r.mainId).toBe('I50');
      expect(r.mainName).toBe('SidecarButton');
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('Object.keys on getNodeById handle includes type and width', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'Keys' });

      const run = await runUseFigmaScript(
        `
const shell = figma.createFrame();
const r = figma.createRectangle();
shell.appendChild(r);
figma.currentPage.appendChild(shell);
const h = figma.getNodeById(shell.id);
return { keys: Object.keys(h).sort(), hasChildren: 'children' in h };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      const out = run.result as { keys: string[]; hasChildren: boolean };
      expect(out.keys).toContain('id');
      expect(out.keys).toContain('type');
      expect(out.keys).toContain('name');
      expect(out.keys).toContain('width');
      expect(out.keys).toContain('children');
      expect(out.hasChildren).toBe(true);
    });
  });
});
