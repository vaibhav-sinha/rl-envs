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
import type { FileEnvelope } from '../../src/model/types.js';
import { COMPONENT_MASTERS_PAGE_NAME } from '../../src/persistence/componentGraphNormalize.js';

const fixture = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/figma-export/minimal-frame.snapshot.json'
);

function findNodeById(envelope: FileEnvelope, id: string): boolean {
  let found = false;
  function walk(nodes: { id: string; children?: unknown[] }[]): void {
    for (const n of nodes) {
      if (n.id === id) found = true;
      if (Array.isArray(n.children)) walk(n.children as { id: string; children?: unknown[] }[]);
    }
  }
  for (const page of envelope.document.children) {
    walk(page.children);
  }
  return found;
}

function componentSetEnvelope(): FileEnvelope {
  return {
    schemaVersion: 1,
    fileKey: 'prune-set-test',
    fileName: 'PruneSetTest',
    nextInternalId: 200,
    document: {
      id: 'I0',
      type: 'DOCUMENT',
      name: 'Document',
      children: [
        {
          id: 'I50',
          type: 'PAGE',
          name: 'Design',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          children: [
            {
              id: 'I100',
              type: 'COMPONENT_SET',
              name: 'Badge',
              sourceFigmaId: '10:0',
              x: 0,
              y: 0,
              width: 80,
              height: 32,
              componentIds: ['I1', 'I2'],
            },
            {
              id: 'I200',
              type: 'INSTANCE',
              name: 'BadgeInstSet',
              x: 0,
              y: 0,
              width: 80,
              height: 32,
              mainComponentId: 'I100',
            },
            {
              id: 'I201',
              type: 'INSTANCE',
              name: 'BadgeInstVariant',
              x: 0,
              y: 40,
              width: 80,
              height: 32,
              mainComponentId: 'I1',
            },
          ],
        },
        {
          id: 'I90',
          type: 'PAGE',
          name: COMPONENT_MASTERS_PAGE_NAME,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          children: [
            {
              id: 'I1',
              type: 'COMPONENT',
              name: 'Small',
              sourceFigmaId: '10:1',
              x: 0,
              y: 0,
              width: 60,
              height: 24,
              rootFrameId: 'I10',
            },
            {
              id: 'I10',
              type: 'FRAME',
              name: 'SmallRoot',
              x: 0,
              y: 0,
              width: 60,
              height: 24,
              children: [],
            },
            {
              id: 'I2',
              type: 'COMPONENT',
              name: 'Large',
              sourceFigmaId: '10:2',
              x: 0,
              y: 0,
              width: 120,
              height: 40,
              rootFrameId: 'I20',
            },
            {
              id: 'I20',
              type: 'FRAME',
              name: 'LargeRoot',
              x: 0,
              y: 0,
              width: 120,
              height: 40,
              children: [],
            },
          ],
        },
      ],
    },
  };
}

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

  it('removes COMPONENT_SET variants from __Component Masters and related instances', () => {
    const envelope = componentSetEnvelope();
    const pruned = pruneEnvelopeBySourceFigmaIds(envelope, ['10:0']);

    const designPage = pruned.document.children.find((p) => p.name === 'Design')!;
    expect(designPage.children.find((n) => n.id === 'I100')).toBeUndefined();
    expect(designPage.children.find((n) => n.id === 'I200')).toBeUndefined();
    expect(designPage.children.find((n) => n.id === 'I201')).toBeUndefined();

    for (const id of ['I1', 'I2', 'I10', 'I20']) {
      expect(findNodeById(pruned, id)).toBe(false);
    }

    const masters = pruned.document.children.find((p) => p.name === COMPONENT_MASTERS_PAGE_NAME)!;
    expect(masters.children).toHaveLength(0);
  });

  it('removes a single COMPONENT variant and patches surviving COMPONENT_SET', () => {
    const envelope = componentSetEnvelope();
    const pruned = pruneEnvelopeBySourceFigmaIds(envelope, ['10:1']);

    expect(findNodeById(pruned, 'I1')).toBe(false);
    expect(findNodeById(pruned, 'I10')).toBe(false);
    expect(findNodeById(pruned, 'I2')).toBe(true);
    expect(findNodeById(pruned, 'I20')).toBe(true);

    const designPage = pruned.document.children.find((p) => p.name === 'Design')!;
    const set = designPage.children.find((n) => n.id === 'I100');
    expect(set).toBeDefined();
    if (set?.type === 'COMPONENT_SET') {
      expect(set.componentIds).toEqual(['I2']);
    }

    expect(designPage.children.find((n) => n.id === 'I201')).toBeUndefined();
    expect(designPage.children.find((n) => n.id === 'I200')).toBeDefined();
  });
});
