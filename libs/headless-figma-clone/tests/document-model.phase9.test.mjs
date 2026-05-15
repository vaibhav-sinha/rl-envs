/**
 * Phase-9 document envelope structural tests (component graph nodes).
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
const COMPONENT_ID = /^(I[0-9]+|COMP[0-9]+)$/;

function walkScene(scene, depth = 0) {
  assert.ok(depth < 200, 'depth guard');
  if (scene.type === 'COMPONENT') {
    assert.ok(COMPONENT_ID.test(scene.id), `COMPONENT id ${scene.id}`);
    assert.equal(typeof scene.rootFrameId, 'string');
    assert.ok(NODE_ID.test(scene.rootFrameId));
    return;
  }
  assert.ok(NODE_ID.test(scene.id));
  if (scene.type === 'COMPONENT_SET') {
    assert.ok(Array.isArray(scene.componentIds) && scene.componentIds.length >= 1);
    assert.equal(typeof scene.variantPropertyKey, 'string');
    assert.ok(Array.isArray(scene.variantOptions));
    assert.equal(typeof scene.baseComponentId, 'string');
    return;
  }
  if (scene.type === 'INSTANCE') {
    assert.equal(typeof scene.mainComponentId, 'string');
    return;
  }
  if (scene.type === 'FRAME' || scene.type === 'GROUP' || scene.type === 'SECTION' || scene.type === 'TRANSFORM_GROUP') {
    for (const ch of scene.children) walkScene(ch, depth + 1);
  }
}

test('phase9 graph-native component nodes in demo fixture', () => {
  const env = readFixture('phase5-demo.hfc.json');
  assert.equal(env.schemaVersion, 1);
  const page = env.document.children[0];
  assert.equal(page.type, 'PAGE');
  let sawInstance = false;
  let sawComponent = false;
  for (const ch of page.children) {
    if (ch.type === 'INSTANCE') sawInstance = true;
    if (ch.type === 'COMPONENT' || ch.type === 'COMPONENT_SET') sawComponent = true;
    walkScene(ch);
  }
  assert.ok(sawInstance, 'expected at least one INSTANCE in phase5-demo');
  assert.ok(sawComponent, 'expected COMPONENT or COMPONENT_SET in phase5-demo');
});
