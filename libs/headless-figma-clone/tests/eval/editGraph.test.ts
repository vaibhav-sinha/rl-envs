import { describe, expect, it } from 'vitest';
import { addedIdsUnder, buildEditGraph } from '../../src/eval/editGraph.js';
import { loadFixture } from './helpers.js';

describe('EditGraph', () => {
  it('detects no changes when identical', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('minimal', 'after');
    const g = buildEditGraph(before, after);
    expect(g.equal).toBe(true);
  });

  it('detects added frame under page', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('add-frame', 'after');
    const g = buildEditGraph(before, after);
    expect(g.addedIds.has('I20')).toBe(true);
    const underPage = addedIdsUnder(g, 'I2', after);
    expect(underPage).toContain('I20');
  });

  it('detects rename as modify', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('rename-board', 'after');
    const g = buildEditGraph(before, after);
    expect(g.modifiedIds.has('I3')).toBe(true);
  });
});
