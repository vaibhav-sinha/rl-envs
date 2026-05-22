import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaSnapshotInProcess, isLocalHfcImportAvailable } from '../src/hfc-import-local.js';
import {
  assembledToFigmaPluginSnapshot,
  SnapshotAssembler,
} from '../src/snapshot-assembler.js';
import {
  STREAM_PROTOCOL_VERSION,
  type SerializedNodeWire,
  type StreamPart,
} from '../src/stream-protocol.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../headless-figma-clone/tests/fixtures/figma-export'
);

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

describe.skipIf(!isLocalHfcImportAvailable())('in-process HFC import cleared instance paints', () => {
  it('preserves [] shell paints from assembled stream through convertFigmaSnapshot', async () => {
    const raw = readFileSync(join(fixturesDir, 'instance-cleared-paints.snapshot.json'), 'utf8');
    const fixture = JSON.parse(raw) as {
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
    };

    const assembler = new SnapshotAssembler();
    assembler.applySessionStart({
      kind: 'session_start',
      streamProtocol: STREAM_PROTOCOL_VERSION,
      exportId: 'test',
      hfcFileName: fixture.figmaFileName,
      snapshotVersion: fixture.snapshotVersion,
      figmaFileKey: fixture.figmaFileKey,
      figmaFileName: fixture.figmaFileName,
      totals: { nodes: 4, iconExports: 0, rasterImages: 0 },
    });
    assembler.applyMeta({
      kind: 'meta',
      exportedAt: fixture.exportedAt,
      variableCollections: fixture.variableCollections,
      paintStyles: fixture.paintStyles,
      textStyles: fixture.textStyles,
      effectStyles: fixture.effectStyles,
      gridStyles: fixture.gridStyles,
    });
    for (const part of treeStream(fixture.document)) {
      if (part.kind === 'tree_enter') assembler.applyTreeEnter(part);
      else assembler.applyTreeExit();
    }

    const assembled = assembler.finish();
    const instWire = assembled.document.children?.[0]?.children?.[0]?.children?.[0];
    expect(instWire?.properties.fills).toEqual([]);

    const snapshot = assembledToFigmaPluginSnapshot({ ...assembled, assets: [] });
    const imported = await importFigmaSnapshotInProcess(fixture.figmaFileName, snapshot, []);
    const page = imported.envelope.document.children.find((p) => p.name === 'Page');
    const screen = page?.children.find((c) => c.name === 'Screen');
    const inst = screen?.children.find((c) => c.type === 'INSTANCE' && c.name === 'ClearedBtn');
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type !== 'INSTANCE') return;
    expect(inst.fills).toEqual([]);
    expect(inst.strokes).toEqual([]);
  });
});
