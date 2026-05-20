import { closeSync, openSync, readSync, statSync } from 'node:fs';

const SESSION_END_TAIL_BYTES = 128 * 1024;

/** Fast check for session_end without reading all of parts.jsonl. */
export function partsFileHasSessionEnd(partsPath: string): boolean {
  const stat = statSync(partsPath);
  const readLen = Math.min(stat.size, SESSION_END_TAIL_BYTES);
  const fd = openSync(partsPath, 'r');
  try {
    const buf = Buffer.alloc(readLen);
    readSync(fd, buf, 0, readLen, Math.max(0, stat.size - readLen));
    const text = buf.toString('utf8');
    return text.includes('session_end');
  } finally {
    closeSync(fd);
  }
}
