import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { ExportStreamSessionStore, splitNdjsonBody } from '../src/export-stream-session.js';
import { streamPartToLine } from '../src/stream-protocol.js';

describe('splitNdjsonBody', () => {
  it('splits multiple NDJSON lines', () => {
    const a = streamPartToLine({ kind: 'tree_exit' }).trim();
    const b = streamPartToLine({ kind: 'tree_exit' }).trim();
    expect(splitNdjsonBody(`${a}\n${b}\n`)).toEqual([a, b]);
  });
});

describe('ExportStreamSessionStore.appendPart batch', () => {
  it('appends multiple lines in one request with a single seq', () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'tb-batch-'));
    process.env.TB_TASKS_DIR = join(baseDir, 'drafts');
    process.env.TB_EXPORT_DIR = join(baseDir, 'exports');
    const store = new ExportStreamSessionStore(loadConfig());
    const { exportId } = store.createSession();
    const lineA = streamPartToLine({ kind: 'tree_exit' }).trim();
    const lineB = streamPartToLine({ kind: 'tree_exit' }).trim();
    const first = store.appendPart(exportId, `${lineA}\n${lineB}`);
    const second = store.appendPart(exportId, lineA);
    expect(first.lineCount).toBe(2);
    expect(first.seq).toBe(1);
    expect(second.seq).toBe(2);
    rmSync(baseDir, { recursive: true, force: true });
  });
});
