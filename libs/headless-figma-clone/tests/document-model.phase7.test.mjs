/**
 * Phase-7 document envelope structural tests (no TypeScript build required).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readFixture(name) {
  return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf8'));
}

const NODE_ID = /^I[0-9]+$/;
const LAYOUT_SIZING = new Set(['FIXED', 'HUG', 'FILL']);

function walkScene(scene, depth = 0) {
  assert.ok(depth < 200, 'depth guard');
  assert.ok(NODE_ID.test(scene.id));
  if (scene.layoutSizingHorizontal !== undefined) {
    assert.ok(LAYOUT_SIZING.has(scene.layoutSizingHorizontal));
  }
  if (scene.layoutSizingVertical !== undefined) {
    assert.ok(LAYOUT_SIZING.has(scene.layoutSizingVertical));
  }
  if (scene.constraints) {
    assert.ok(typeof scene.constraints.horizontal === 'string');
    assert.ok(typeof scene.constraints.vertical === 'string');
  }
  if (scene.type === 'FRAME' || scene.type === 'GROUP' || scene.type === 'SECTION' || scene.type === 'TRANSFORM_GROUP') {
    for (const ch of scene.children) walkScene(ch, depth + 1);
  }
}

test('phase7-layout-sizing.hfc.json structure', () => {
  const env = readFixture('phase7-layout-sizing.hfc.json');
  assert.equal(env.schemaVersion, 1);
  const page = env.document.children[0];
  assert.equal(page.type, 'PAGE');
  for (const ch of page.children) walkScene(ch);
});
