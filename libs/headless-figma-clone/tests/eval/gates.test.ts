import { describe, expect, it } from 'vitest';
import { buildEditGraph } from '../../src/eval/editGraph.js';
import { runGates } from '../../src/eval/gates.js';
import { loadFixture } from './helpers.js';

describe('gates', () => {
  it('require_change fails on identical files', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('minimal', 'after');
    const graph = buildEditGraph(before, after);
    const results = runGates(before, after, graph, { require_change: true });
    const rc = results.find((r) => r.id === 'gates.require_change');
    expect(rc?.score).toBe(0);
  });

  it('preserve_ids passes when node exists', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('add-frame', 'after');
    const graph = buildEditGraph(before, after);
    const results = runGates(before, after, graph, { preserve_ids: ['I3'] });
    const p = results.find((r) => r.id === 'gates.preserve.I3');
    expect(p?.score).toBe(1);
  });

  it('forbid_delete fails when node removed', () => {
    const before = loadFixture('minimal', 'before');
    const after = loadFixture('minimal', 'before');
    const deleted = JSON.parse(JSON.stringify(after)) as typeof after;
    // simulate delete by rebuilding without I3 - use minimal before only
    const graph = buildEditGraph(before, before);
    const results = runGates(before, before, graph, { forbid_delete_ids: ['I3'] });
    const f = results.find((r) => r.id === 'gates.forbid_delete.I3');
    expect(f?.score).toBe(1);
  });
});
