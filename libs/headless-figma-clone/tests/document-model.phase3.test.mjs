/**
 * Phase-3 document envelope structural tests (no TypeScript build required).
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
const SHA256 = /^[a-f0-9]{64}$/;

function assertGradientPaint(p, label) {
  assert.ok(p.type === 'GRADIENT_LINEAR' || p.type === 'GRADIENT_RADIAL', `${label} gradient type`);
  assert.ok(Array.isArray(p.gradientStops) && p.gradientStops.length >= 2, `${label} must have at least 2 stops`);
  for (const s of p.gradientStops) {
    assert.ok(typeof s.position === 'number' && s.position >= 0 && s.position <= 1, `${label} stop position`);
    assert.ok(s.color && typeof s.color.r === 'number', `${label} stop color`);
  }
}

function assertImagePaint(p, label, assetIds) {
  assert.equal(p.type, 'IMAGE', `${label} type`);
  assert.ok(typeof p.imageHash === 'string' && SHA256.test(p.imageHash), `${label} imageHash`);
  assert.ok(['FILL', 'FIT', 'TILE', 'STRETCH'].includes(p.scaleMode), `${label} scaleMode`);
  assert.ok(assetIds.has(p.imageHash), `${label} imageHash must exist in assets.byId`);
}

function walkFillsPaints(fills, assetIds, label) {
  if (!fills?.length) return;
  for (const paint of fills) {
    if (paint.type === 'SOLID') {
      for (const ch of ['r', 'g', 'b']) assert.ok(typeof paint.color[ch] === 'number');
    } else if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') {
      assertGradientPaint(paint, label);
    } else if (paint.type === 'IMAGE') {
      assertImagePaint(paint, label, assetIds);
    }
  }
}

function walkScene(scene, assetIds) {
  assert.ok(NODE_ID.test(scene.id));
  assert.equal(typeof scene.name, 'string');
  for (const g of ['x', 'y', 'width', 'height']) {
    assert.ok(typeof scene[g] === 'number', `${scene.type}.${g}`);
  }
  if (scene.type === 'FRAME') {
    walkFillsPaints(scene.fills, assetIds, 'FRAME.fills');
    walkFillsPaints(scene.backgrounds, assetIds, 'FRAME.backgrounds');
    for (const ch of scene.children) {
      walkScene(ch, assetIds);
    }
    return;
  }
  walkFillsPaints(scene.fills, assetIds, 'fills');
  if (scene.strokes?.length) {
    walkFillsPaints(scene.strokes, assetIds, 'strokes');
  }
  if (scene.type === 'POLYGON') {
    assert.ok(Number.isInteger(scene.pointCount) && scene.pointCount >= 3, 'POLYGON.pointCount');
  }
  if (scene.type === 'STAR') {
    assert.ok(Number.isInteger(scene.pointCount) && scene.pointCount >= 3, 'STAR.pointCount');
    assert.ok(typeof scene.innerRadius === 'number' && scene.innerRadius >= 0 && scene.innerRadius <= 1, 'STAR.innerRadius');
  }
}

function validateHappyPhase3Envelope(env) {
  assert.equal(env.schemaVersion, 1);
  assert.ok(env.assets?.byId);
  const assetIds = new Set(Object.keys(env.assets.byId));
  const page = env.document.children[0];
  assert.equal(page.type, 'PAGE');
  for (const ch of page.children) {
    assert.ok(['FRAME', 'RECTANGLE', 'POLYGON', 'STAR', 'ELLIPSE', 'LINE', 'TEXT'].includes(ch.type), `scene type ${ch.type}`);
    walkScene(ch, assetIds);
  }
}

test('phase3-minimal.valid.json structure', () => {
  validateHappyPhase3Envelope(readFixture('phase3-minimal.valid.json'));
});

test('phase3-showcase.hfc.json structure', () => {
  validateHappyPhase3Envelope(readFixture('phase3-showcase.hfc.json'));
});

test('phase3-invalid.gradient.json fails stop count', () => {
  assert.throws(() => validateHappyPhase3Envelope(readFixture('phase3-invalid.gradient.json')), /at least 2 stops/);
});

test('phase3-invalid.imagehash.json fails registry', () => {
  assert.throws(() => validateHappyPhase3Envelope(readFixture('phase3-invalid.imagehash.json')), /imageHash must exist/);
});
