import { closeSync, openSync, writeSync } from 'node:fs';

type JsonWrite = (chunk: string) => void;

function writeJsonPrimitive(write: JsonWrite, value: unknown): void {
  if (value === undefined) {
    write('null');
    return;
  }
  const chunk = JSON.stringify(value);
  write(chunk ?? 'null');
}

/** Write JSON without building one giant string (avoids V8 max string length). */
export function writeJsonChunks(write: JsonWrite, value: unknown): void {
  if (value === undefined) {
    write('null');
    return;
  }
  if (value === null || typeof value !== 'object') {
    writeJsonPrimitive(write, value);
    return;
  }
  if (Array.isArray(value)) {
    write('[');
    for (let i = 0; i < value.length; i++) {
      if (i > 0) write(',');
      const el = value[i];
      writeJsonChunks(write, el === undefined ? null : el);
    }
    write(']');
    return;
  }
  write('{');
  const keys = Object.keys(value as Record<string, unknown>);
  let first = true;
  for (const key of keys) {
    const v = (value as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (!first) write(',');
    first = false;
    write(JSON.stringify(key) + ':');
    writeJsonChunks(write, v);
  }
  write('}');
}

export function writeJsonFile(path: string, value: unknown): void {
  const fd = openSync(path, 'w');
  try {
    writeJsonChunks((chunk) => {
      if (typeof chunk !== 'string') {
        throw new TypeError(`writeJsonFile: expected string chunk, got ${typeof chunk}`);
      }
      writeSync(fd, chunk, null, 'utf8');
    }, value);
    writeSync(fd, '\n', null, 'utf8');
  } finally {
    closeSync(fd);
  }
}
