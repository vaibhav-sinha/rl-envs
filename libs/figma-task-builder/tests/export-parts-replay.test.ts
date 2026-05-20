import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { replayPartsIntoAssembler, streamPartLineForSpool } from '../src/export-parts-replay.js';
import { partsFileHasSessionEnd } from '../src/export-parts-util.js';
import { streamPartToLine, STREAM_PROTOCOL_VERSION } from '../src/stream-protocol.js';

describe('export parts replay', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('spools asset lines without base64', () => {
    const line = streamPartLineForSpool({
      kind: 'asset',
      contentHash: 'abc',
      mimeType: 'image/png',
      bytesBase64: 'AAAA',
      figmaNodeId: '1:2',
    });
    expect(line).not.toContain('bytesBase64');
    expect(line).toContain('"contentHash":"abc"');
  });

  it('replays parts into assembler and detects session_end in tail', async () => {
    dir = mkdtempSync(join(tmpdir(), 'tb-replay-'));
    const exportId = '550e8400-e29b-41d4-a716-446655440000';
    const parts = [
      {
        kind: 'session_start' as const,
        streamProtocol: STREAM_PROTOCOL_VERSION,
        exportId,
        hfcFileName: 'Test',
        snapshotVersion: 1,
        figmaFileKey: null,
        figmaFileName: 'Test',
        totals: { nodes: 1, iconExports: 0, rasterImages: 0 },
      },
      {
        kind: 'meta' as const,
        exportedAt: new Date().toISOString(),
        variableCollections: [],
        paintStyles: [],
        textStyles: [],
        effectStyles: [],
        gridStyles: [],
      },
      {
        kind: 'tree_enter' as const,
        node: { id: '0:1', type: 'FRAME', name: 'Root', properties: {} },
      },
      { kind: 'tree_exit' as const },
      { kind: 'session_end' as const, exportId },
    ];
    const partsPath = join(dir, 'parts.jsonl');
    const body = parts.map((p) => streamPartLineForSpool(p)).join('');
    writeFileSync(partsPath, body, 'utf8');
    expect(body).toContain('session_end');
    expect(partsFileHasSessionEnd(partsPath)).toBe(true);

    const assembler = await replayPartsIntoAssembler(dir, exportId);
    const assembled = assembler.finish();
    expect(assembled.document.name).toBe('Root');
  });
});
