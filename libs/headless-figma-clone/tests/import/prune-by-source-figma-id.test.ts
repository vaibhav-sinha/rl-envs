import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import {
  envelopeHasSourceFigmaIds,
  pruneEnvelopeBySourceFigmaIds,
} from '../../src/import/pruneBySourceFigmaId.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

const fixture = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/figma-export/minimal-frame.snapshot.json'
);

describe('pruneEnvelopeBySourceFigmaIds', () => {
  it('removes excluded node and preserves siblings', () => {
    const snapshot = parseFigmaPluginSnapshot(JSON.parse(readFileSync(fixture, 'utf8')));
    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Minimal' });
    expect(envelopeHasSourceFigmaIds(envelope)).toBe(true);

    const pruned = pruneEnvelopeBySourceFigmaIds(envelope, ['1:2']);
    const page = pruned.document.children[0]!;
    expect(page.children.find((n) => n.sourceFigmaId === '1:2')).toBeUndefined();
    expect(page.children.length).toBe(0);
  });

  it('is a no-op when exclude list is empty', () => {
    const snapshot = parseFigmaPluginSnapshot(JSON.parse(readFileSync(fixture, 'utf8')));
    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Minimal' });
    const pruned = pruneEnvelopeBySourceFigmaIds(envelope, []);
    expect(pruned.document.children[0]?.children.length).toBe(
      envelope.document.children[0]?.children.length
    );
  });
});
