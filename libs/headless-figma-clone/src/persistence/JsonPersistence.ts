import { readFileSync } from 'node:fs';
import type { FileEnvelope } from '../model/types.js';
import { PersistenceError } from '../util/errors.js';
import { normalizeComponentEnvelope } from './componentGraphNormalize.js';
import { atomicWriteJsonEnvelope } from './streamJsonEnvelope.js';

export interface PersistenceService {
  save(params: { path: string; envelope: FileEnvelope }): Promise<void>;
  load(params: { path: string }): Promise<FileEnvelope>;
}

export class JsonPersistence implements PersistenceService {
  async save(params: { path: string; envelope: FileEnvelope }): Promise<void> {
    await atomicWriteJsonEnvelope(params.path, params.envelope);
  }

  async load(params: { path: string }): Promise<FileEnvelope> {
    let raw: string;
    try {
      raw = readFileSync(params.path, 'utf8');
    } catch (e) {
      throw new PersistenceError(
        e instanceof Error ? e.message : String(e),
        params.path,
        e
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new PersistenceError(
        e instanceof Error ? e.message : 'Invalid JSON',
        params.path,
        e
      );
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new PersistenceError('Envelope is not an object', params.path);
    }
    const env = parsed as FileEnvelope;
    if (env.schemaVersion !== 1) {
      throw new PersistenceError(
        `Unsupported schemaVersion: ${String(env.schemaVersion)}`,
        params.path
      );
    }
    normalizeComponentEnvelope(env);
    return env;
  }
}
