/**
 * Phase-5 document envelope structural tests (no TypeScript build required).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readFixture(name) {
  const p = join(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(p, 'utf8'));
}

const NODE_ID = /^I[0-9]+$/;

function walkScene(scene, depth = 0) {
  assert.ok(depth < 200, 'depth guard');
  assert.ok(NODE_ID.test(scene.id));
  assert.equal(typeof scene.name, 'string');
  for (const g of ['x', 'y', 'width', 'height']) {
    assert.ok(typeof scene[g] === 'number', `${scene.type}.${g}`);
  }
  if (scene.type === 'FRAME' || scene.type === 'TRANSFORM_GROUP') {
    for (const ch of scene.children) walkScene(ch, depth + 1);
    return;
  }
  if (scene.type === 'BOOLEAN_OPERATION') {
    for (const ch of scene.children) walkScene(ch, depth + 1);
    return;
  }
  if (scene.type === 'TABLE') {
    assert.ok(Number.isInteger(scene.columnCount) && scene.columnCount >= 1);
    assert.ok(Number.isInteger(scene.rowCount) && scene.rowCount >= 1);
    assert.equal(scene.columnWidths.length, scene.columnCount);
    assert.equal(scene.rowHeights.length, scene.rowCount);
    if (scene.cells.length !== scene.columnCount * scene.rowCount) {
      throw new Error('TABLE.cells must have length columnCount * rowCount');
    }
    return;
  }
  if (scene.type === 'COMPONENT_INSTANCE') {
    assert.equal(typeof scene.mainComponentId, 'string');
    return;
  }
}

function validateHappyPhase5(env) {
  assert.equal(env.schemaVersion, 1);
  if (env.variableCollections) {
    for (const col of env.variableCollections) {
      assert.ok(typeof col.id === 'string');
      assert.ok(col.modes.some((m) => m.id === col.defaultModeId));
      for (const v of col.variables) {
        assert.ok(['COLOR', 'FLOAT', 'STRING'].includes(v.resolvedType));
        const modeId = col.defaultModeId;
        assert.ok(v.valuesByMode[modeId] !== undefined, `variable ${v.id} missing value for default mode`);
      }
    }
  }
  const page = env.document.children[0];
  assert.equal(page.type, 'PAGE');
  for (const ch of page.children) {
    walkScene(ch);
  }
  for (const comp of env.components ?? []) {
    walkScene(comp.root);
  }
}

test('phase5-minimal.valid.json structure', () => {
  validateHappyPhase5(readFixture('phase5-minimal.valid.json'));
});

test('phase5-demo.hfc.json structure', () => {
  validateHappyPhase5(readFixture('phase5-demo.hfc.json'));
});

test('phase5-invalid-table.json fails cell count', () => {
  assert.throws(() => validateHappyPhase5(readFixture('phase5-invalid-table.json')), /cells/);
});
