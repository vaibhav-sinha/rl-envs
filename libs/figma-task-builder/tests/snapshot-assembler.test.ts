import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assembledToFigmaPluginSnapshot,
  SnapshotAssembler,
} from '../src/snapshot-assembler.js';
import {
  STREAM_PROTOCOL_VERSION,
  streamPartToLine,
  type SerializedNodeWire,
  type StreamPart,
} from '../src/stream-protocol.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../headless-figma-clone/tests/fixtures/figma-export'
);

type SnapshotFixture = {
  snapshotVersion: number;
  exportedAt: string;
  figmaFileKey: string | null;
  figmaFileName: string;
  document: SerializedNodeWire & { children?: SerializedNodeWire[] };
  variableCollections: Record<string, unknown>[];
  paintStyles: Record<string, unknown>[];
  textStyles: Record<string, unknown>[];
  effectStyles: Record<string, unknown>[];
  gridStyles: Record<string, unknown>[];
  assets: unknown[];
};

function* treeStream(
  node: SerializedNodeWire & { children?: SerializedNodeWire[] }
): Generator<StreamPart> {
  const { children, ...wire } = node;
  yield { kind: 'tree_enter', node: wire };
  for (const child of children ?? []) {
    yield* treeStream(child);
  }
  yield { kind: 'tree_exit' };
}

function snapshotToStreamParts(
  exportId: string,
  snapshot: SnapshotFixture
): StreamPart[] {
  const parts: StreamPart[] = [
    {
      kind: 'session_start',
      streamProtocol: STREAM_PROTOCOL_VERSION,
      exportId,
      hfcFileName: snapshot.figmaFileName,
      snapshotVersion: snapshot.snapshotVersion,
      figmaFileKey: snapshot.figmaFileKey,
      figmaFileName: snapshot.figmaFileName,
      totals: { nodes: 4, iconExports: 0, rasterImages: 0 },
    },
    {
      kind: 'meta',
      exportedAt: snapshot.exportedAt,
      variableCollections: snapshot.variableCollections,
      paintStyles: snapshot.paintStyles,
      textStyles: snapshot.textStyles,
      effectStyles: snapshot.effectStyles,
      gridStyles: snapshot.gridStyles,
    },
    ...treeStream(snapshot.document),
    { kind: 'session_end', exportId },
  ];
  return parts;
}

describe('SnapshotAssembler', () => {
  it('round-trips minimal snapshot via NDJSON stream parts', () => {
    const raw = readFileSync(join(fixturesDir, 'minimal-frame.snapshot.json'), 'utf8');
    const snapshot = JSON.parse(raw) as SnapshotFixture;
    const exportId = 'test-export-id-0000-0000-000000000001';
    const parts = snapshotToStreamParts(exportId, snapshot);

    const assembler = new SnapshotAssembler();
    for (const part of parts) {
      switch (part.kind) {
        case 'session_start':
          assembler.applySessionStart(part);
          break;
        case 'meta':
          assembler.applyMeta(part);
          break;
        case 'tree_enter':
          assembler.applyTreeEnter(part);
          break;
        case 'tree_exit':
          assembler.applyTreeExit();
          break;
        case 'session_end':
          break;
      }
    }

    const assembled = assembler.finish();
    expect(assembled.document).toEqual(snapshot.document);
    expect(assembled.figmaFileName).toBe('Minimal');
    expect(assembled.meta.exportedAt).toBe(snapshot.exportedAt);

    const hfcSnapshot = assembledToFigmaPluginSnapshot(assembled);
    expect(hfcSnapshot.document).toEqual(snapshot.document);
    expect(hfcSnapshot.assets).toEqual([]);
  });

  it('merges node_props into assembled document', () => {
    const exportId = 'test-export-id-0000-0000-000000000003';
    const raw = readFileSync(join(fixturesDir, 'minimal-frame.snapshot.json'), 'utf8');
    const snapshot = JSON.parse(raw) as SnapshotFixture;
    const parts = snapshotToStreamParts(exportId, snapshot);
    const frameId = snapshot.document.children?.[0]?.id;
    expect(frameId).toBeDefined();
    parts.push({
      kind: 'node_props',
      nodeId: frameId!,
      properties: { hfcIconSvgAsset: frameId! },
    });

    const assembler = new SnapshotAssembler();
    for (const part of parts) {
      switch (part.kind) {
        case 'session_start':
          assembler.applySessionStart(part);
          break;
        case 'meta':
          assembler.applyMeta(part);
          break;
        case 'tree_enter':
          assembler.applyTreeEnter(part);
          break;
        case 'tree_exit':
          assembler.applyTreeExit();
          break;
        case 'node_props':
          assembler.applyNodeProps(part);
          break;
        case 'session_end':
          break;
      }
    }

    const assembled = assembler.finish();
    const frame = assembled.document.children?.[0];
    expect(frame?.properties.hfcIconSvgAsset).toBe(frameId);
  });

  it('parses NDJSON lines from streamPartToLine', () => {
    const exportId = 'test-export-id-0000-0000-000000000002';
    const part: StreamPart = {
      kind: 'session_start',
      streamProtocol: STREAM_PROTOCOL_VERSION,
      exportId,
      hfcFileName: 'x',
      snapshotVersion: 1,
      figmaFileKey: null,
      figmaFileName: 'x',
      totals: { nodes: 1, iconExports: 0, rasterImages: 0 },
    };
    const line = streamPartToLine(part);
    expect(JSON.parse(line.trim()).kind).toBe('session_start');
  });
});
