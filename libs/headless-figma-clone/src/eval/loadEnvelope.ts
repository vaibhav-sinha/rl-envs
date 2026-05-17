import { readFileSync } from 'node:fs';
import type { FileEnvelope } from '../model/types.js';

export function loadEnvelopeFromPath(path: string): FileEnvelope {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as FileEnvelope;
  if (!parsed?.document) {
    throw new Error(`Invalid envelope at ${path}: missing document`);
  }
  return parsed;
}
