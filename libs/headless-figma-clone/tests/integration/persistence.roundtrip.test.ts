import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('persistence round-trip', () => {
  it('save and reload preserve envelope', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-rt-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      const { filePath } = await engine.createEmptyFile({ fileName: 'Rt' });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'FRAME',
            name: 'F',
            x: 1,
            y: 2,
            width: 10,
            height: 20,
            children: [],
          },
        },
      ]);
      const after = engine.getActiveFile();

      const engine2 = new DocumentEngine({ persistence, logger });
      await engine2.loadFromDisk({ absolutePath: filePath });
      const loaded = engine2.getActiveFile();
      expect(loaded).toEqual(after);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('round-trip preserves TEXT, effects, and backgrounds', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-rt2-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      const { filePath } = await engine.createEmptyFile({ fileName: 'Rt2' });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'FRAME',
            name: 'Chrome',
            x: 0,
            y: 0,
            width: 50,
            height: 40,
            children: [],
            backgrounds: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3 } }],
            effects: [{ type: 'DROP_SHADOW', offset: { x: 1, y: 2 }, radius: 3 }],
            clipsContent: true,
            rotation: 5,
          },
        },
        {
          op: 'createNode',
          parentId: 'I3',
          node: {
            type: 'TEXT',
            name: 'T',
            x: 1,
            y: 2,
            width: 40,
            height: 16,
            characters: 'ab',
            styledSegments: [{ start: 0, end: 1, style: { fontSize: 20 } }],
            effects: [{ type: 'DROP_SHADOW', offset: { x: 0, y: 0 }, radius: 1 }],
          },
        },
      ]);
      const after = engine.getActiveFile();
      const engine2 = new DocumentEngine({ persistence, logger });
      await engine2.loadFromDisk({ absolutePath: filePath });
      expect(engine2.getActiveFile()).toEqual(after);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
