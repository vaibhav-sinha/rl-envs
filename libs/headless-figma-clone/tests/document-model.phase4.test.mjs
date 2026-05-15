/**
 * Phase-4 document envelope structural tests (no TypeScript build required).
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
  if (scene.type === 'FRAME') {
    if (scene.layoutGrids) {
      for (const gr of scene.layoutGrids) {
        assert.equal(gr.type, 'COLUMNS');
        assert.ok(Number.isInteger(gr.count) && gr.count >= 1, 'grid count');
        assert.ok(typeof gr.gutter === 'number' && gr.gutter >= 0, 'gutter');
      }
    }
    for (const ch of scene.children) walkScene(ch, depth + 1);
    return;
  }
  if (scene.type === 'TRANSFORM_GROUP') {
    for (const ch of scene.children) walkScene(ch, depth + 1);
    return;
  }
  if (scene.type === 'BOOLEAN_OPERATION') {
    assert.ok(['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE'].includes(scene.booleanOperation));
    for (const ch of scene.children) walkScene(ch, depth + 1);
    return;
  }
  if (scene.type === 'VECTOR') {
    assert.ok(Array.isArray(scene.vectorPaths) && scene.vectorPaths.length >= 1);
    for (const vp of scene.vectorPaths) {
      assert.ok(vp.windingRule === 'NONZERO' || vp.windingRule === 'EVENODD');
      assert.ok(typeof vp.data === 'string' && vp.data.length > 0);
    }
    return;
  }
}

function validateHappyPhase4(env) {
  assert.equal(env.schemaVersion, 1);
  const page = env.document.children[0];
  assert.equal(page.type, 'PAGE');
  for (const ch of page.children) {
    walkScene(ch);
  }
}

test('phase4-minimal.valid.json structure', () => {
  validateHappyPhase4(readFixture('phase4-minimal.valid.json'));
});

test('phase4-nav-grid-mask.json structure', () => {
  validateHappyPhase4(readFixture('phase4-nav-grid-mask.json'));
});

test('phase4-invalid.grid.json fails grid count', () => {
  assert.throws(() => validateHappyPhase4(readFixture('phase4-invalid.grid.json')), /grid count/);
});
