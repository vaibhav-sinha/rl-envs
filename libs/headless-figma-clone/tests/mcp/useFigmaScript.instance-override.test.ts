import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine, findEnvelopeNode } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import type { FileEnvelope, InstanceNode } from '../../src/model/types.js';
import { createConsoleLogger } from '../../src/util/logger.js';

function withWs<T>(fn: () => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-inst-ovr-'));
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

function masterTextCharacters(env: FileEnvelope, masterTextId: string): string | undefined {
  const node = findEnvelopeNode(env, masterTextId);
  return node?.type === 'TEXT' ? node.characters : undefined;
}

describe('useFigmaScript detached instance overrides', () => {
  it('text edits on detached createInstance route to overrides, not component master', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'InstOverride' });

      const run = await runUseFigmaScript(
        `
const frame = figma.createFrame();
frame.resize(200, 80);
const title = figma.createText();
title.characters = 'Collections';
title.fontSize = 14;
frame.appendChild(title);
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);

const inst = figma.createInstance(comp);
const textNode = inst.findOne((n) => n.type === 'TEXT');
textNode.characters = 'Order details';
figma.currentPage.appendChild(inst);

return {
  masterTextId: textNode.id,
  instanceId: inst.id,
  overrideKey: textNode.id,
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const r = run.result as { masterTextId: string; instanceId: string; overrideKey: string };
      const env = engine.getActiveFile()!;
      const masterChars = masterTextCharacters(env, r.masterTextId);
      expect(masterChars).toBe('Collections');

      const instance = findEnvelopeNode(env, r.instanceId);
      expect(instance?.type).toBe('INSTANCE');
      const overrides = (instance as InstanceNode).overrides ?? {};
      expect(overrides[r.overrideKey]?.characters).toBe('Order details');

      expect(
        run.operations.some((o) => o.op === 'updateNode' && o.nodeId === r.masterTextId)
      ).toBe(false);
      expect(run.touchedNodeIds).toContain(r.instanceId);
    });
  });

  it('getStyledTextSegments on detached inst.findAll text before card append', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'InstOverrideSegments' });

      const run = await runUseFigmaScript(
        `
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const card = figma.createAutoLayout('VERTICAL', { name: 'Card' });
const frame = figma.createFrame();
frame.resize(200, 80);
const title = figma.createText();
title.characters = 'Ellementry';
title.fontSize = 14;
title.fontName = { family: 'Inter', style: 'Regular' };
frame.appendChild(title);
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);

const inst = comp.createInstance();
card.appendChild(inst);

const texts = inst.findAll((n) => n.type === 'TEXT');
const segs = texts[0].getStyledTextSegments(['fontName']);
await figma.loadFontAsync(segs[0].fontName);
texts[0].characters = 'Dyson';

figma.currentPage.appendChild(card);

return {
  masterTextId: texts[0].id,
  instanceId: inst.id,
  segLen: segs.length,
  fontFamily: segs[0].fontName.family,
  editedChars: texts[0].characters,
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const r = run.result as {
        masterTextId: string;
        instanceId: string;
        segLen: number;
        fontFamily: string;
        editedChars: string;
      };
      expect(r.segLen).toBeGreaterThan(0);
      expect(r.fontFamily).toBeTruthy();
      expect(r.editedChars).toBe('Dyson');

      const env = engine.getActiveFile()!;
      expect(masterTextCharacters(env, r.masterTextId)).toBe('Ellementry');

      const instance = findEnvelopeNode(env, r.instanceId);
      expect(instance?.type).toBe('INSTANCE');
      const overrides = (instance as InstanceNode).overrides ?? {};
      expect(overrides[r.masterTextId]?.characters).toBe('Dyson');
    });
  });

  it('getStyledTextSegments reflects instance fontName override on detached text', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'InstOverrideFontMerge' });

      const run = await runUseFigmaScript(
        `
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
const frame = figma.createFrame();
frame.resize(200, 80);
const title = figma.createText();
title.characters = 'Label';
title.fontSize = 14;
frame.appendChild(title);
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);

const inst = figma.createInstance(comp);
const textNode = inst.findOne((n) => n.type === 'TEXT');
textNode.fontName = { family: 'Inter', style: 'Bold' };
const segs = textNode.getStyledTextSegments(['fontName']);
return { style: segs[0].fontName.style };
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;
      expect((run.result as { style: string }).style).toBe('Bold');
    });
  });

  it('findOne().set() batch-updates detached instance overrides', async () => {
    await withWs(async () => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.createEmptyFile({ fileName: 'InstOverrideSet' });

      const run = await runUseFigmaScript(
        `
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const frame = figma.createFrame();
frame.resize(200, 80);
const title = figma.createText();
title.characters = 'Collections';
title.fontSize = 14;
frame.appendChild(title);
figma.currentPage.appendChild(frame);
const comp = figma.createComponentFromNode(frame);

const inst = figma.createInstance(comp);
const textNode = inst.findOne((n) => n.type === 'TEXT');
textNode.set({ characters: 'Order details' });
figma.currentPage.appendChild(inst);

return {
  masterTextId: textNode.id,
  instanceId: inst.id,
  overrideKey: textNode.id,
  editedChars: textNode.characters,
};
`.trim(),
        engine
      );

      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const r = run.result as {
        masterTextId: string;
        instanceId: string;
        overrideKey: string;
        editedChars: string;
      };
      expect(r.editedChars).toBe('Order details');

      const env = engine.getActiveFile()!;
      expect(masterTextCharacters(env, r.masterTextId)).toBe('Collections');

      const instance = findEnvelopeNode(env, r.instanceId);
      expect(instance?.type).toBe('INSTANCE');
      const overrides = (instance as InstanceNode).overrides ?? {};
      expect(overrides[r.overrideKey]?.characters).toBe('Order details');
    });
  });
});
