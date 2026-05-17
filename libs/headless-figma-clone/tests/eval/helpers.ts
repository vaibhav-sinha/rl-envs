import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FileEnvelope } from '../../src/model/types.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function loadFixture(name: string, variant: 'before' | 'after'): FileEnvelope {
  const path = join(FIXTURES_DIR, `${name}.${variant}.hfc.json`);
  return JSON.parse(readFileSync(path, 'utf8')) as FileEnvelope;
}
