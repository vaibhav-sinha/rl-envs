import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('streamed envelope save', () => {
  const prevStream = process.env.HFC_STREAM_SAVE;
  const prevPretty = process.env.HFC_JSON_PRETTY;

  afterEach(() => {
    if (prevStream === undefined) delete process.env.HFC_STREAM_SAVE;
    else process.env.HFC_STREAM_SAVE = prevStream;
    if (prevPretty === undefined) delete process.env.HFC_JSON_PRETTY;
    else process.env.HFC_JSON_PRETTY = prevPretty;
  });

  it('default stream save round-trips', async () => {
    delete process.env.HFC_STREAM_SAVE;
    delete process.env.HFC_JSON_PRETTY;
    const base = mkdtempSync(join(tmpdir(), 'hfc-stream-'));
    try {
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({
        persistence,
        logger: createConsoleLogger('error'),
      });
      const { filePath } = await engine.createEmptyFile({ fileName: 'Stream' });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 10, height: 10 },
        },
      ]);
      const before = engine.getActiveFile();

      const engine2 = new DocumentEngine({
        persistence,
        logger: createConsoleLogger('error'),
      });
      await engine2.loadFromDisk({ absolutePath: filePath });
      expect(engine2.getActiveFile()).toEqual(before);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('buffer fallback when HFC_STREAM_SAVE=0', async () => {
    process.env.HFC_STREAM_SAVE = '0';
    delete process.env.HFC_JSON_PRETTY;
    const base = mkdtempSync(join(tmpdir(), 'hfc-buf-'));
    try {
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({
        persistence,
        logger: createConsoleLogger('error'),
      });
      const { filePath } = await engine.createEmptyFile({ fileName: 'Buf' });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: { type: 'TEXT', name: 'T', x: 0, y: 0, width: 50, height: 20, characters: 'hi' },
        },
      ]);
      const raw = readFileSync(filePath, 'utf8');
      expect(raw.includes('\n  ')).toBe(false);
      const loaded = await persistence.load({ path: filePath });
      expect(loaded).toEqual(engine.getActiveFile());
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
