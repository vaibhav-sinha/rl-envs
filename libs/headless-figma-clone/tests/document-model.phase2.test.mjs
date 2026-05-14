/**
 * Phase-2 document envelope structural tests (no TypeScript build required).
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

function maxIdNum(id) {
  return Number(id.slice(1));
}

function assertSolidPaint(paint, label) {
  assert.equal(paint.type, 'SOLID', `${label}: paint.type`);
  assert.ok(paint.color, `${label}: color`);
  for (const ch of ['r', 'g', 'b']) {
    assert.ok(typeof paint.color[ch] === 'number', `${label}: color.${ch} number`);
    assert.ok(paint.color[ch] >= 0 && paint.color[ch] <= 1, `${label}: color.${ch} range 0..1`);
  }
}

function validateStyledSegmentsUtf16(characters, segments) {
  if (!segments || segments.length === 0) return;
  const len = characters.length;
  const sorted = [...segments].sort((a, b) => a.start - b.start || a.end - b.end);
  let prevEnd = -1;
  for (const s of sorted) {
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end)) {
      throw new Error('styledSegments: start/end must be integers');
    }
    if (s.start < 0 || s.end > len || s.start >= s.end) {
      throw new Error(`styledSegments: range [${s.start},${s.end}) invalid for length ${len}`);
    }
    if (s.start < prevEnd) {
      throw new Error('styledSegments: overlapping ranges');
    }
    prevEnd = s.end;
  }
}

function validateSceneNode(scene, maxSeenRef) {
  assert.ok(scene.type === 'FRAME' || scene.type === 'TEXT', `scene type ${scene.type}`);
  assert.ok(NODE_ID.test(scene.id));
  maxSeenRef.v = Math.max(maxSeenRef.v, maxIdNum(scene.id));
  assert.equal(typeof scene.name, 'string');
  for (const g of ['x', 'y', 'width', 'height']) {
    assert.ok(typeof scene[g] === 'number', `${scene.type}.${g}`);
  }
  assert.ok(scene.width >= 0 && scene.height >= 0, 'dimensions non-negative');

  if (scene.type === 'FRAME') {
    assert.ok(Array.isArray(scene.children));
    if (scene.fills) {
      assert.ok(Array.isArray(scene.fills));
      for (const p of scene.fills) assertSolidPaint(p, 'fills');
    }
    if (scene.backgrounds) {
      assert.ok(Array.isArray(scene.backgrounds));
      for (const p of scene.backgrounds) assertSolidPaint(p, 'backgrounds');
    }
    if (scene.strokes) {
      assert.ok(Array.isArray(scene.strokes));
      for (const p of scene.strokes) assertSolidPaint(p, 'strokes');
    }
    if (scene.strokeWeight !== undefined) {
      assert.ok(typeof scene.strokeWeight === 'number');
      assert.ok(scene.strokeWeight >= 0);
    }
    if (scene.effects) {
      assert.ok(Array.isArray(scene.effects));
      for (const e of scene.effects) {
        assert.equal(e.type, 'DROP_SHADOW');
        assert.ok(e.offset && typeof e.offset.x === 'number' && typeof e.offset.y === 'number');
      }
    }
    if (scene.clipsContent !== undefined) assert.equal(typeof scene.clipsContent, 'boolean');
    if (scene.opacity !== undefined) {
      assert.ok(typeof scene.opacity === 'number');
      assert.ok(scene.opacity >= 0 && scene.opacity <= 1);
    }
    if (scene.rotation !== undefined) assert.ok(typeof scene.rotation === 'number');
    if (scene.visible !== undefined) assert.equal(typeof scene.visible, 'boolean');
    for (const c of scene.children) {
      validateSceneNode(c, maxSeenRef);
    }
  }

  if (scene.type === 'TEXT') {
    assert.equal(typeof scene.characters, 'string');
    const segs = scene.styledSegments ?? [];
    assert.ok(Array.isArray(segs));
    validateStyledSegmentsUtf16(scene.characters, segs);
    if (scene.fills) {
      for (const p of scene.fills) assertSolidPaint(p, 'text fills');
    }
    if (scene.effects) {
      for (const e of scene.effects) assert.equal(e.type, 'DROP_SHADOW');
    }
  }
}

function validatePhase2Envelope(obj) {
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

  const maxSeenRef = { v: 0 };

  for (const page of doc.children) {
    assert.equal(page.type, 'PAGE');
    assert.ok(NODE_ID.test(page.id));
    maxSeenRef.v = Math.max(maxSeenRef.v, maxIdNum(page.id));
    assert.ok(Array.isArray(page.children));

    for (const scene of page.children) {
      validateSceneNode(scene, maxSeenRef);
    }
  }

  assert.ok(
    obj.nextInternalId > maxSeenRef.v,
    `nextInternalId (${obj.nextInternalId}) must exceed max node numeric (${maxSeenRef.v})`
  );
}

test('phase2-minimal.valid.json satisfies Phase 2 envelope rules', () => {
  validatePhase2Envelope(readFixture('phase2-minimal.valid.json'));
});

test('phase2-exit.json satisfies Phase 2 envelope rules', () => {
  validatePhase2Envelope(readFixture('phase2-exit.json'));
});

test('phase2-invalid-segments.json fails styled segment validation', () => {
  const fx = readFixture('phase2-invalid-segments.json');
  assert.throws(() => validatePhase2Envelope(fx), /overlapping|styledSegments/i);
});
