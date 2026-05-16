import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

function loadEnvelope(name: string) {
  const raw = readFileSync(join(fixturesDir, name), 'utf8');
  const snapshot = parseFigmaPluginSnapshot(JSON.parse(raw));
  return importFigmaPluginSnapshot(snapshot, { fileName: name }).envelope;
}

function compileFrame(envelope: ReturnType<typeof loadEnvelope>, frameName: string) {
  const page = envelope.document.children[0]!;
  const frame = page.children.find((n) => n.type === 'FRAME' && n.name === frameName);
  expect(frame?.type).toBe('FRAME');
  if (frame?.type !== 'FRAME') throw new Error('frame not found');
  return designCompiler.compileSubtree({
    envelope,
    rootNodeId: frame.id,
    options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
  });
}

describe('import → compile parity', () => {
  it('positions group children relative to group wrapper', () => {
    const envelope = loadEnvelope('group-nested.snapshot.json');
    const out = compileFrame(envelope, 'Parent');
    const blob = `${out.html}\n${out.css}`;
    expect(blob).toMatch(/hfc-group/);
    expect(blob).toMatch(/left:30px;top:40px/);
    expect(blob).toMatch(/left:0px;top:0px/);
    expect(blob).toMatch(/left:20px;top:10px/);
  });

  it('applies constraints CSS when imported from snapshot', () => {
    const envelope = loadEnvelope('constraints-pin.snapshot.json');
    const page = envelope.document.children[0]!;
    const rect = page.children[0]?.type === 'FRAME' ? page.children[0].children[0] : undefined;
    expect(rect?.type).toBe('RECTANGLE');
    if (rect?.type === 'RECTANGLE') {
      expect(rect.constraints).toEqual({ horizontal: 'MAX', vertical: 'MIN' });
    }
    const out = compileFrame(envelope, 'Parent');
    expect(`${out.html}\n${out.css}`).toMatch(/right:/);
  });

  it('prefers explicit x/y over absoluteBoundingBox on import', () => {
    const envelope = loadEnvelope('minimal-frame.snapshot.json');
    const page = envelope.document.children[0]!;
    const frame = page.children.find((n) => n.type === 'FRAME' && n.name === 'Card');
    const text = frame?.type === 'FRAME' ? frame.children.find((c) => c.type === 'TEXT') : undefined;
    expect(text?.type).toBe('TEXT');
    expect(text!.x).toBe(16);
    expect(text!.y).toBe(40);
  });

  it('does not double-translate grouped text when x/y are frame-space', () => {
    const envelope = loadEnvelope('group-wrong-local.snapshot.json');
    const out = compileFrame(envelope, 'Parent');
    const blob = `${out.html}\n${out.css}`;
    expect(blob).toMatch(/left:112px;top:308px/);
    expect(blob).toMatch(/left:0px;top:0px/);
    expect(blob).not.toMatch(/left:112px;top:308px;width:120px[^}]*left:112px;top:308px/);
  });
});
