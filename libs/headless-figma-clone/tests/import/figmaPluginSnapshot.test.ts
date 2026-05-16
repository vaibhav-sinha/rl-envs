import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

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
});
