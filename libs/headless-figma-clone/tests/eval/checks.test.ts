import { describe, expect, it } from 'vitest';
import { buildCatalog } from '../../src/eval/catalog.js';
import { buildEditGraph } from '../../src/eval/editGraph.js';
import { runSpecChecks } from '../../src/eval/checks/runChecks.js';
import { loadFixture } from './helpers.js';

describe('check handlers', () => {
  const before = () => loadFixture('minimal', 'before');
  const catalog = () => buildCatalog(before());

  it('node_exists', () => {
    const after = loadFixture('minimal', 'after');
    const r = runSpecChecks(
      { id: 'x', type: 'node_exists', node_id: 'I3' },
      before(),
      after,
      buildEditGraph(before(), after),
      catalog()
    );
    expect(r.score).toBe(1);
  });

  it('min_added_under counts new descendant', () => {
    const after = loadFixture('add-frame', 'after');
    const r = runSpecChecks(
      { id: 'x', type: 'min_added_under', parent_id: 'I2', min: 1 },
      before(),
      after,
      buildEditGraph(before(), after),
      catalog()
    );
    expect(r.score).toBe(1);
  });

  it('min_added_under partial credit', () => {
    const after = loadFixture('add-frame', 'after');
    const r = runSpecChecks(
      { id: 'x', type: 'min_added_under', parent_id: 'I2', min: 2 },
      before(),
      after,
      buildEditGraph(before(), after),
      catalog()
    );
    expect(r.score).toBe(0.5);
  });

  it('component_instances_under counts nested instances', () => {
    const after = loadFixture('with-instance', 'after');
    const r = runSpecChecks(
      {
        id: 'x',
        type: 'component_instances_under',
        scope_id: 'I3',
        component_id: 'COMP1',
        min_instances: 2,
      },
      before(),
      after,
      buildEditGraph(before(), after),
      catalog()
    );
    expect(r.score).toBe(1);
  });

  it('metadata_only_under passes on rename only', () => {
    const after = loadFixture('rename-board', 'after');
    const r = runSpecChecks(
      { id: 'x', type: 'metadata_only_under', parent_id: 'I2' },
      before(),
      after,
      buildEditGraph(before(), after),
      catalog()
    );
    expect(r.score).toBe(1);
  });

  it('property_on_node', () => {
    const after = loadFixture('minimal', 'after');
    const r = runSpecChecks(
      { id: 'x', type: 'property_on_node', node_id: 'I3', property: 'name', equals: 'Board' },
      before(),
      after,
      buildEditGraph(before(), after),
      catalog()
    );
    expect(r.score).toBe(1);
  });
});
