import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../src/config.js';
import { ExportStreamSessionStore } from '../src/export-stream-session.js';
import { streamPartToLine, STREAM_PROTOCOL_VERSION } from '../src/stream-protocol.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../headless-figma-clone/tests/fixtures/figma-export'
);

describe('ExportStreamSessionStore disk replay finish', () => {
  let baseDir: string;
  let config: ReturnType<typeof loadConfig>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    baseDir = mkdtempSync(join(tmpdir(), 'tb-replay-finish-'));
    process.env.TB_TASKS_DIR = join(baseDir, 'drafts');
    process.env.TB_EXPORT_DIR = join(baseDir, 'exports');
    process.env.TB_HFC_HTTP_ONLY = '1';
    config = loadConfig();
    process.env.HFC_IMPORT_SESSION_ROOTS = config.exportSessionsDir;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/import/hfc-from-session')) {
        return new Response(
          JSON.stringify({
            fileKey: 'fk',
            fileName: 'Minimal',
            slug: 'Minimal',
            envelope: { schemaVersion: 1, fileKey: 'fk', fileName: 'Minimal', document: {} },
            assets: [],
            figmaToHfc: {},
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      return originalFetch(input);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('finishes from disk after store restart (no in-memory assembler)', async () => {
    const snapshot = JSON.parse(
      readFileSync(join(fixturesDir, 'minimal-frame.snapshot.json'), 'utf8')
    ) as {
      snapshotVersion: number;
      exportedAt: string;
      figmaFileKey: string | null;
      figmaFileName: string;
      document: {
        id: string;
        type: string;
        name: string;
        properties: Record<string, unknown>;
        children?: unknown[];
      };
      variableCollections: unknown[];
      paintStyles: unknown[];
      textStyles: unknown[];
      effectStyles: unknown[];
      gridStyles: unknown[];
    };

    const store1 = new ExportStreamSessionStore(config);
    const { exportId } = store1.createSession();

    function walk(node: typeof snapshot.document, append: (line: string) => void): void {
      const { children, ...wire } = node;
      append(
        streamPartToLine({
          kind: 'tree_enter',
          node: wire as { id: string; type: string; name: string; properties: Record<string, unknown> },
        })
      );
      for (const child of (children ?? []) as typeof snapshot.document[]) {
        walk(child, append);
      }
      append(streamPartToLine({ kind: 'tree_exit' }));
    }

    const lines: string[] = [
      streamPartToLine({
        kind: 'session_start',
        streamProtocol: STREAM_PROTOCOL_VERSION,
        exportId,
        hfcFileName: snapshot.figmaFileName,
        snapshotVersion: snapshot.snapshotVersion,
        figmaFileKey: snapshot.figmaFileKey,
        figmaFileName: snapshot.figmaFileName,
        totals: { nodes: 4, iconExports: 0, rasterImages: 0 },
      }),
      streamPartToLine({
        kind: 'meta',
        exportedAt: snapshot.exportedAt,
        variableCollections: snapshot.variableCollections as Record<string, unknown>[],
        paintStyles: snapshot.paintStyles as Record<string, unknown>[],
        textStyles: snapshot.textStyles as Record<string, unknown>[],
        effectStyles: snapshot.effectStyles as Record<string, unknown>[],
        gridStyles: snapshot.gridStyles as Record<string, unknown>[],
      }),
    ];
    walk(snapshot.document, (line) => lines.push(line));
    lines.push(streamPartToLine({ kind: 'session_end', exportId }));

    for (const line of lines) {
      store1.appendPart(exportId, line);
    }

    const store2 = new ExportStreamSessionStore(config);
    const result = await store2.finish(exportId, {
      standaloneFileName: 'Minimal',
      source: 'disk',
    });

    expect(result.filePath).toBe(join(config.exportDir, 'Minimal.hfc.json'));
    expect(result.replayedFromDisk).toBe(true);
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const importCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/import/hfc-from-session')
    );
    expect(importCall).toBeDefined();
  });
});
