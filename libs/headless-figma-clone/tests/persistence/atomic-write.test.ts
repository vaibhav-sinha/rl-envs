import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atomicWriteFileUtf8, readFileUtf8Sync } from '../../src/persistence/atomicWriteFile.js';

describe('atomicWriteFileUtf8', () => {
  it('writes readable utf8 and replaces target atomically', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hfc-atomic-'));
    const target = join(dir, 'out.txt');
    try {
      await atomicWriteFileUtf8(target, 'first');
      expect(readFileUtf8Sync(target)).toBe('first');
      await atomicWriteFileUtf8(target, 'second');
      expect(readFileSync(target, 'utf8')).toBe('second');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
