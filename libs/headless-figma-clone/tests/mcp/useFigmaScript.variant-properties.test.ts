import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('useFigmaScript variantProperties', () => {
  it('returns variantProperties when mainComponent is a variant COMPONENT', async () => {
    const env = emptyEnvelope(100);
    const page = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'COMPONENT', name: 'Default', x: 0, y: 0, width: 120, height: 40, rootFrameId: rootA },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: {
        type: 'COMPONENT_SET',
        name: 'Resend',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        componentIds: [compA],
        variantPropertyKey: 'State',
        variantOptions: ['Default'],
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: {
        type: 'INSTANCE',
        name: 'Inst',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        mainComponentId: compA,
        componentProperties: { State: { type: 'VARIANT', value: 'Default' } },
      },
    });

    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-vp-'));
    const filePath = join(baseDir, 'vp.hfc.json');
    writeFileSync(filePath, JSON.stringify(env));

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.loadFromDisk({ absolutePath: filePath, save: false });

    const run = await runUseFigmaScript(
      `
const inst = figma.getNodeById('${instId}');
return { variantProperties: inst.variantProperties, componentProperties: inst.componentProperties };
`.trim(),
      engine
    );
    rmSync(baseDir, { recursive: true, force: true });

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as {
      variantProperties: Record<string, string> | null;
      componentProperties: Record<string, { value: string }>;
    };
    expect(result.variantProperties).toEqual({ State: 'Default' });
    expect(result.componentProperties.State.value).toBe('Default');
  });

  it('mainComponent.parent exposes COMPONENT_SET with variant children', async () => {
    const env = emptyEnvelope(100);
    const page = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 120, height: 40, children: [] },
    });
    const rootB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'FRAME', name: 'RootB', x: 0, y: 0, width: 140, height: 48, children: [] },
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'COMPONENT', name: 'Default', x: 0, y: 0, width: 120, height: 40, rootFrameId: rootA },
    });
    const compB = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'COMPONENT', name: 'Hover', x: 0, y: 0, width: 140, height: 48, rootFrameId: rootB },
    });
    const setId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: {
        type: 'COMPONENT_SET',
        name: 'Resend',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        componentIds: [compA, compB],
        variantPropertyKey: 'State',
        variantOptions: ['Default', 'Hover'],
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: {
        type: 'INSTANCE',
        name: 'Inst',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        mainComponentId: compA,
        componentProperties: { State: { type: 'VARIANT', value: 'Default' } },
      },
    });

    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-vp-parent-'));
    const filePath = join(baseDir, 'vp-parent.hfc.json');
    writeFileSync(filePath, JSON.stringify(env));

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.loadFromDisk({ absolutePath: filePath, save: false });

    const run = await runUseFigmaScript(
      `
const inst = figma.getNodeById('${instId}');
const main = inst.mainComponent;
const set = main.parent;
return {
  mainType: main?.type,
  setType: set?.type,
  setId: set?.id,
  setName: set?.name,
  variantCount: set?.children?.length ?? 0,
  variantNames: set?.children?.map((c) => c.name) ?? [],
  expectedSetId: '${setId}',
};
`.trim(),
      engine
    );
    rmSync(baseDir, { recursive: true, force: true });

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as {
      mainType: string;
      setType: string;
      setId: string;
      setName: string;
      variantCount: number;
      variantNames: string[];
      expectedSetId: string;
    };
    expect(result.mainType).toBe('COMPONENT');
    expect(result.setType).toBe('COMPONENT_SET');
    expect(result.setId).toBe(result.expectedSetId);
    expect(result.setName).toBe('Resend');
    expect(result.variantCount).toBe(2);
    expect(result.variantNames).toEqual(['Default', 'Hover']);
  });

  it('figma.root.findAll discovers COMPONENT_SET via indexed union', async () => {
    const env = emptyEnvelope(200);
    const page = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 80, height: 32, children: [] },
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: { type: 'COMPONENT', name: 'Small', x: 0, y: 0, width: 80, height: 32, rootFrameId: rootA },
    });
    applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: page,
      node: {
        type: 'COMPONENT_SET',
        name: 'Checkbox-Radio',
        x: 0,
        y: 0,
        width: 80,
        height: 32,
        componentIds: [compA],
        variantPropertyKey: 'State',
        variantOptions: ['Default'],
      },
    });

    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-vp-findall-'));
    const filePath = join(baseDir, 'findall.hfc.json');
    writeFileSync(filePath, JSON.stringify(env));

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.loadFromDisk({ absolutePath: filePath, save: false });

    const run = await runUseFigmaScript(
      `
const hits = figma.root.findAll({ types: ['COMPONENT_SET'], name: 'Checkbox-Radio' });
return { count: hits.length, names: hits.map((h) => h.name) };
`.trim(),
      engine
    );
    rmSync(baseDir, { recursive: true, force: true });

    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as { count: number; names: string[] };
    expect(result.count).toBeGreaterThan(0);
    expect(result.names).toContain('Checkbox-Radio');
  });
});
