/**
 * Phase-8 document envelope structural tests (variables CRUD shape, styles registries, bindings).
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

test('phase8-variables-styles.hfc.json structure', () => {
  const env = readFixture('phase8-variables-styles.hfc.json');
  assert.equal(env.schemaVersion, 1);
  assert.ok(Array.isArray(env.variableCollections));
  assert.ok(Array.isArray(env.paintStyles));
  assert.ok(Array.isArray(env.effectStyles));
  assert.ok(Array.isArray(env.gridStyles));
  const frame = env.document.children[0].children[0];
  assert.equal(frame.type, 'FRAME');
  assert.equal(frame.boundVariables.paddingTop, 'VV8PAD');
  const text = frame.children[0];
  assert.equal(text.boundVariables.fontSize, 'VV8PAD');
});
