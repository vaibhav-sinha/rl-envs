import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../../src/eval/catalog.js';
import {
  collectContentNodeIds,
  runDesignSystemChecks,
} from '../../src/eval/designSystem.js';
import { buildEditGraph } from '../../src/eval/editGraph.js';
import type { FileEnvelope } from '../../src/model/types.js';
import { loadFixture } from './helpers.js';

function cloneEnvelope(env: FileEnvelope): FileEnvelope {
  return JSON.parse(JSON.stringify(env)) as FileEnvelope;
}

describe('runDesignSystemChecks', () => {
  it('marks checks not applicable when there are no content changes', () => {
    const env = loadFixture('minimal', 'before');
    const graph = buildEditGraph(env, env);
    const results = runDesignSystemChecks(env, env, graph, buildCatalog(env));
    expect(results.every((r) => r.applicable === false)).toBe(true);
  });

  it('style_reuse scores bound nodes when catalog has styles', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    after.paintStyles = [
      { id: 'P1', name: 'Primary', paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] },
    ];
    const frame = after.document.children[0]!.children[0]!;
    frame.children.push({
      id: 'I99',
      type: 'RECTANGLE',
      name: 'Box',
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      fillStyleId: 'P1',
    });
    const graph = buildEditGraph(before, after);
    const results = runDesignSystemChecks(before, after, graph, buildCatalog(after));
    const reuse = results.find((r) => r.id === 'design_system.style_reuse')!;
    expect(reuse.applicable).toBe(true);
    expect(reuse.score).toBeGreaterThan(0);
  });

  it('style_reuse is not applicable when file has no design tokens', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('add-frame', 'after');
    const graph = buildEditGraph(before, after);
    const results = runDesignSystemChecks(before, after, graph, buildCatalog(before));
    const reuse = results.find((r) => r.id === 'design_system.style_reuse')!;
    expect(reuse.applicable).toBe(false);
  });

  it('novelty penalizes colors far from catalog tokens', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    after.paintStyles = [
      { id: 'P1', name: 'Black', paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] },
    ];
    after.document.children[0]!.children[0]!.children.push({
      id: 'I99',
      type: 'RECTANGLE',
      name: 'Neon',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 1 } }],
    });
    const graph = buildEditGraph(before, after);
    const results = runDesignSystemChecks(before, after, graph, buildCatalog(after));
    const novelty = results.find((r) => r.id === 'design_system.novelty')!;
    expect(novelty.applicable).toBe(true);
    expect(novelty.score).toBeLessThan(0.5);
  });

  it('novelty rewards colors near catalog tokens', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    after.paintStyles = [
      { id: 'P1', name: 'Black', paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] },
    ];
    after.document.children[0]!.children[0]!.children.push({
      id: 'I99',
      type: 'RECTANGLE',
      name: 'NearBlack',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fills: [{ type: 'SOLID', color: { r: 0.02, g: 0.02, b: 0.02 } }],
    });
    const graph = buildEditGraph(before, after);
    const results = runDesignSystemChecks(before, after, graph, buildCatalog(after));
    const novelty = results.find((r) => r.id === 'design_system.novelty')!;
    expect(novelty.score).toBeGreaterThan(0.8);
  });

  it('edited_regression penalizes losing style bindings', () => {
    const before = cloneEnvelope(loadFixture('minimal', 'before'));
    before.textStyles = [{ id: 'T1', name: 'Body', fontSize: 14, fontWeight: 400 }];
    const text = before.document.children[0]!.children[0]!.children[0]!;
    if (text.type === 'TEXT') text.textStyleId = 'T1';

    const after = cloneEnvelope(before);
    const afterText = after.document.children[0]!.children[0]!.children[0]!;
    if (afterText.type === 'TEXT') delete afterText.textStyleId;

    const graph = buildEditGraph(before, after);
    const results = runDesignSystemChecks(before, after, graph, buildCatalog(before));
    const regression = results.find((r) => r.id === 'design_system.edited_regression')!;
    expect(regression.applicable).toBe(true);
    expect(regression.score).toBeLessThan(1);
  });

  it('clone_cheat penalizes duplicate geometry without instances', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    const board = after.document.children[0]!.children[0]!;
    board.children.push(
      {
        id: 'I20',
        type: 'FRAME',
        name: 'CloneA',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
        children: [],
      },
      {
        id: 'I21',
        type: 'FRAME',
        name: 'CloneB',
        x: 120,
        y: 0,
        width: 100,
        height: 50,
        fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }],
        children: [],
      }
    );
    const graph = buildEditGraph(before, after);
    const results = runDesignSystemChecks(before, after, graph, buildCatalog(after));
    const cheat = results.find((r) => r.id === 'design_system.clone_cheat')!;
    expect(cheat.applicable).toBe(true);
    expect(cheat.score).toBeLessThan(1);
  });

  it('collectContentNodeIds includes descendants of added nodes', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('add-frame', 'after');
    const graph = buildEditGraph(before, after);
    const ids = collectContentNodeIds(graph, after);
    expect(ids.has('I20')).toBe(true);
  });
});
