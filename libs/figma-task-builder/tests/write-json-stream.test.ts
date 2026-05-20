import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeJsonFile } from '../src/write-json-stream.js';

describe('writeJsonFile', () => {
  let dir: string;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('writes nested objects without throwing on large trees', () => {
    dir = mkdtempSync(join(tmpdir(), 'tb-json-'));
    const children = Array.from({ length: 2000 }, (_, i) => ({
      id: String(i),
      type: 'FRAME',
      name: `n-${i}`,
      properties: { i },
    }));
    const doc = { id: 'root', type: 'FRAME', name: 'R', properties: {}, children };
    const path = join(dir, 'out.json');
    writeJsonFile(path, doc);
    const raw = readFileSync(path, 'utf8');
    expect(raw.length).toBeGreaterThan(50_000);
    expect(JSON.parse(raw).children).toHaveLength(2000);
  });

  it('omits undefined object properties and never passes undefined to writeSync', () => {
    dir = mkdtempSync(join(tmpdir(), 'tb-json-'));
    const path = join(dir, 'undef.json');
    writeJsonFile(path, { kept: 1, dropped: undefined, nested: { a: undefined, b: 2 } });
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
      kept: number;
      dropped?: unknown;
      nested: { a?: unknown; b: number };
    };
    expect(parsed.kept).toBe(1);
    expect(parsed.dropped).toBeUndefined();
    expect(parsed.nested.b).toBe(2);
    expect(parsed.nested.a).toBeUndefined();
  });
});
