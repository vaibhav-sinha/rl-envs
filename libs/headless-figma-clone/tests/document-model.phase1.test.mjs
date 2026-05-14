/**
 * Phase-1 document envelope structural tests (no TypeScript build required).
 * Spec source: libs/headless-figma-clone/docs/design-doc/data-model.md
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

function assertSolidPaint(paint, label) {
  assert.equal(paint.type, 'SOLID', `${label}: paint.type`);
  assert.ok(paint.color, `${label}: color`);
  for (const ch of ['r', 'g', 'b']) {
    assert.ok(typeof paint.color[ch] === 'number', `${label}: color.${ch} number`);
    assert.ok(paint.color[ch] >= 0 && paint.color[ch] <= 1, `${label}: color.${ch} range 0..1`);
  }
}

function validatePhase1Envelope(obj) {
  assert.ok(obj && typeof obj === 'object');
  assert.equal(typeof obj.schemaVersion, 'number');
  assert.ok(obj.schemaVersion >= 1);
  assert.equal(typeof obj.fileKey, 'string');
  assert.ok(obj.fileKey.length > 0);
  assert.equal(typeof obj.fileName, 'string');
  assert.equal(typeof obj.nextInternalId, 'number');
  assert.ok(obj.nextInternalId >= 1);

  const doc = obj.document;
  assert.equal(doc.type, 'DOCUMENT');
  assert.ok(NODE_ID.test(doc.id));
  assert.ok(Array.isArray(doc.children));
  assert.ok(doc.children.length >= 1, 'DOCUMENT must have >=1 PAGE');

  const maxIdNum = (id) => Number(id.slice(1));

  let maxSeen = 0;
  for (const page of doc.children) {
    assert.equal(page.type, 'PAGE');
    assert.ok(NODE_ID.test(page.id));
    maxSeen = Math.max(maxSeen, maxIdNum(page.id));
    assert.ok(Array.isArray(page.children));

    for (const scene of page.children) {
      if (scene.type !== 'FRAME') {
        throw new Error(`Phase1 fixture must only contain FRAME scene nodes, got ${scene.type}`);
      }
      assert.ok(NODE_ID.test(scene.id));
      maxSeen = Math.max(maxSeen, maxIdNum(scene.id));
      assert.equal(typeof scene.name, 'string');
      for (const g of ['x', 'y', 'width', 'height']) {
        assert.ok(typeof scene[g] === 'number', `FRAME.${g}`);
      }
      assert.ok(scene.width >= 0 && scene.height >= 0, 'FRAME dimensions non-negative');
      assert.ok(Array.isArray(scene.children));

      if (scene.fills) {
        assert.ok(Array.isArray(scene.fills));
        for (const p of scene.fills) assertSolidPaint(p, 'fills');
      }
      if (scene.strokes) {
        assert.ok(Array.isArray(scene.strokes));
        for (const p of scene.strokes) assertSolidPaint(p, 'strokes');
      }
      if (scene.strokeWeight !== undefined) {
        assert.ok(typeof scene.strokeWeight === 'number');
        assert.ok(scene.strokeWeight >= 0);
      }
    }
  }

  assert.ok(
    obj.nextInternalId > maxSeen,
    `nextInternalId (${obj.nextInternalId}) must exceed max node numeric (${maxSeen})`
  );
}

test('phase1-minimal.valid.json satisfies Phase 1 envelope rules', () => {
  const fx = readFixture('phase1-minimal.valid.json');
  validatePhase1Envelope(fx);
});
