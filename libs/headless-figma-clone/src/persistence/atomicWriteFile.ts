import { closeSync, fsyncSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { PersistenceError } from '../util/errors.js';

export async function atomicWriteFileBinary(targetPath: string, contents: Buffer): Promise<void> {
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true });
  const base = basename(targetPath);
  const tmp = join(dir, `${base}.tmp-${randomBytes(8).toString('hex')}`);
  try {
    writeFileSync(tmp, contents, { mode: 0o644 });
    const fd = openSync(tmp, 'r+');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, targetPath);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore missing tmp */
    }
    throw new PersistenceError(
      e instanceof Error ? e.message : String(e),
      targetPath,
      e
    );
  }
}

export async function atomicWriteFileUtf8(targetPath: string, contents: string): Promise<void> {
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true });
  const base = basename(targetPath);
  const tmp = join(dir, `${base}.tmp-${randomBytes(8).toString('hex')}`);
  try {
    writeFileSync(tmp, contents, { encoding: 'utf8', mode: 0o644 });
    const fd = openSync(tmp, 'r+');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, targetPath);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore missing tmp */
    }
    throw new PersistenceError(
      e instanceof Error ? e.message : String(e),
      targetPath,
      e
    );
  }
}

/** @internal sync read for tests */
export function readFileUtf8Sync(p: string): string {
  return readFileSync(p, 'utf8');
}
