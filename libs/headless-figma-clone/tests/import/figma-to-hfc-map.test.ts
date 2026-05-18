import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

const fixture = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/figma-export/minimal-frame.snapshot.json'
);

describe('importFigmaPluginSnapshot figmaToHfc', () => {
  it('returns a map from snapshot node ids to envelope ids', () => {
    const snapshot = parseFigmaPluginSnapshot(JSON.parse(readFileSync(fixture, 'utf8')));
    const { envelope, figmaToHfc } = importFigmaPluginSnapshot(snapshot, { fileName: 'Minimal' });

    expect(figmaToHfc['0:0']).toBe(envelope.document.id);
    expect(figmaToHfc['0:1']).toBe(envelope.document.children[0]?.id);
    const page = envelope.document.children[0]!;
    const card = page.children.find((n) => n.name === 'Card');
    expect(card?.id).toBe(figmaToHfc['1:2']);
    expect(figmaToHfc['1:2']).toMatch(/^I[0-9]+$/);
  });
});
