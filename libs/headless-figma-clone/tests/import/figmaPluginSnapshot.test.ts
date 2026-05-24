import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { boundsFromProps, childPageOrigin } from '../../src/import/propertyMappers.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

describe('importFigmaPluginSnapshot', () => {
  it('imports minimal frame + text snapshot into FileEnvelope', () => {
    const raw = readFileSync(join(fixturesDir, 'minimal-frame.snapshot.json'), 'utf8');
    const snapshot = parseFigmaPluginSnapshot(JSON.parse(raw));
    const { envelope, report } = importFigmaPluginSnapshot(snapshot, { fileName: 'Minimal Import' });

    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.fileName).toBe('Minimal Import');
    expect(envelope.document.type).toBe('DOCUMENT');
    expect(envelope.document.children).toHaveLength(1);

    const page = envelope.document.children[0]!;
    expect(page.type).toBe('PAGE');
    expect(page.children.length).toBeGreaterThanOrEqual(1);

    const frame = page.children.find((n) => n.type === 'FRAME' && n.name === 'Card');
    expect(frame).toBeDefined();
    if (frame && frame.type === 'FRAME') {
      expect(frame.fills?.[0]).toMatchObject({
        type: 'SOLID',
        color: { r: 0.2, g: 0.4, b: 0.9 },
      });
      const text = frame.children.find((c) => c.type === 'TEXT');
      expect(text).toBeDefined();
      if (text && text.type === 'TEXT') {
        expect(text.characters).toBe('Hello');
      }
    }

    expect(report.skippedNodes).toEqual([]);
  });

  it('converts absoluteBoundingBox to parent-relative coords for nested nodes', () => {
    const raw = readFileSync(join(fixturesDir, 'minimal-frame.snapshot.json'), 'utf8');
    const snapshot = parseFigmaPluginSnapshot(JSON.parse(raw));
    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Nested' });

    const page = envelope.document.children[0]!;
    const frame = page.children.find((n) => n.type === 'FRAME' && n.name === 'Card');
    expect(frame?.type).toBe('FRAME');
    if (frame?.type !== 'FRAME') return;

    const text = frame.children.find((c) => c.type === 'TEXT');
    expect(text?.type).toBe('TEXT');
    expect(frame.x).toBe(40);
    expect(frame.y).toBe(40);
    expect(text!.x).toBe(16);
    expect(text!.y).toBe(40);

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: frame.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.html}\n${out.css}`;
    expect(blob).toContain('left:0px;top:0px');
    expect(blob).toMatch(/left:16px;top:40px/);
  });
});

describe('boundsFromProps', () => {
  it('subtracts parent page origin from absoluteBoundingBox', () => {
    const frame = boundsFromProps({
      absoluteBoundingBox: { x: 40, y: 40, width: 200, height: 120 },
    });
    const pageOrigin = childPageOrigin(undefined, { x: 0, y: 0 });
    const text = boundsFromProps(
      { absoluteBoundingBox: { x: 56, y: 80, width: 80, height: 24 } },
      childPageOrigin(pageOrigin, frame)
    );
    expect(text).toMatchObject({ x: 16, y: 40, width: 80, height: 24 });
  });

  it('prefers absoluteBoundingBox over frame-space x/y when parent origin is set', () => {
    const groupOrigin = { x: 112, y: 308 };
    const text = boundsFromProps(
      {
        x: 112,
        y: 308,
        width: 120,
        height: 32,
        absoluteBoundingBox: { x: 112, y: 308, width: 120, height: 32 },
      },
      groupOrigin
    );
    expect(text).toMatchObject({ x: 0, y: 0, width: 120, height: 32 });
  });

  it('imports SECTION → FRAME with parent-relative coords from page-absolute export', () => {
    const raw = readFileSync(join(fixturesDir, 'section-frame.snapshot.json'), 'utf8');
    const snapshot = parseFigmaPluginSnapshot(JSON.parse(raw));
    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Section Import' });

    const page = envelope.document.children[0]!;
    const section = page.children.find((n) => n.type === 'SECTION' && n.name === 'Orders');
    expect(section?.type).toBe('SECTION');
    if (section?.type !== 'SECTION') return;

    expect(section.x).toBe(2179);
    expect(section.y).toBe(-2659);

    const frame = section.children.find((c) => c.type === 'FRAME');
    expect(frame?.type).toBe('FRAME');
    if (frame?.type !== 'FRAME') return;

    expect(frame.x).toBe(2742);
    expect(frame.y).toBe(3003);

    const text = frame.children.find((c) => c.type === 'TEXT');
    expect(text?.type).toBe('TEXT');
    if (text?.type !== 'TEXT') return;
    expect(text.x).toBe(24);
    expect(text.y).toBe(24);

    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: section.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${compiled.html}\n${compiled.css}`;
    expect(blob).toContain('Order details');
    expect(blob).toMatch(/left:2742px|left:80px/);
  });
});
