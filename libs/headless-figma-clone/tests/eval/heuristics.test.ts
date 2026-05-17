import { describe, expect, it } from 'vitest';
import { buildEditGraph } from '../../src/eval/editGraph.js';
import { runHeuristics } from '../../src/eval/heuristics.js';
import type { FileEnvelope } from '../../src/model/types.js';
import { loadFixture } from './helpers.js';

function cloneEnvelope(env: FileEnvelope): FileEnvelope {
  return JSON.parse(JSON.stringify(env)) as FileEnvelope;
}

describe('runHeuristics', () => {
  it('marks checks not applicable when there are no content changes', () => {
    const env = loadFixture('minimal', 'before');
    const graph = buildEditGraph(env, env);
    const results = runHeuristics(env, env, graph);
    expect(results.every((r) => r.applicable === false)).toBe(true);
  });

  it('contrast penalizes low-contrast text on light backgrounds', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    const board = after.document.children[0]!.children[0]!;
    board.children.push({
      id: 'I99',
      type: 'TEXT',
      name: 'LowContrast',
      x: 0,
      y: 0,
      width: 80,
      height: 20,
      characters: 'Hard to read',
      fontSize: 14,
      fills: [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }],
    });
    const graph = buildEditGraph(before, after);
    const results = runHeuristics(before, after, graph);
    const contrast = results.find((r) => r.id === 'heuristics.contrast')!;
    expect(contrast.applicable).toBe(true);
    expect(contrast.score).toBeLessThan(0.5);
  });

  it('contrast rewards high-contrast text', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    const board = after.document.children[0]!.children[0]!;
    board.children.push({
      id: 'I99',
      type: 'TEXT',
      name: 'HighContrast',
      x: 0,
      y: 0,
      width: 80,
      height: 20,
      characters: 'Readable',
      fontSize: 14,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    });
    const graph = buildEditGraph(before, after);
    const results = runHeuristics(before, after, graph);
    const contrast = results.find((r) => r.id === 'heuristics.contrast')!;
    expect(contrast.score).toBeGreaterThan(0.9);
  });

  it('font_count penalizes too many distinct fonts', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    const board = after.document.children[0]!.children[0]!;
    const families = ['Inter', 'Roboto', 'Arial', 'Georgia', 'Helvetica', 'Tahoma'];
    families.forEach((family, i) => {
      board.children.push({
        id: `I${90 + i}`,
        type: 'TEXT',
        name: `T${i}`,
        x: 0,
        y: i * 20,
        width: 80,
        height: 20,
        characters: family,
        fontSize: 12 + i,
        fontName: { family, style: 'Regular' },
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
      });
    });
    const graph = buildEditGraph(before, after);
    const results = runHeuristics(before, after, graph);
    const fonts = results.find((r) => r.id === 'heuristics.font_count')!;
    expect(fonts.applicable).toBe(true);
    expect(fonts.score).toBeLessThan(1);
  });

  it('readable_font_size penalizes tiny text', () => {
    const before = loadFixture('minimal', 'before');
    const after = cloneEnvelope(before);
    const board = after.document.children[0]!.children[0]!;
    board.children.push({
      id: 'I99',
      type: 'TEXT',
      name: 'Tiny',
      x: 0,
      y: 0,
      width: 80,
      height: 20,
      characters: 'small',
      fontSize: 8,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    });
    const graph = buildEditGraph(before, after);
    const results = runHeuristics(before, after, graph);
    const readable = results.find((r) => r.id === 'heuristics.readable_font_size')!;
    expect(readable.applicable).toBe(true);
    expect(readable.score).toBeLessThan(1);
  });
});
