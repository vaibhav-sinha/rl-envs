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
      const engine = new DocumentEngine({ persistence, phase: 1, logger });
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

      const engine2 = new DocumentEngine({ persistence, phase: 1, logger });
      await engine2.loadFromDisk({ absolutePath: filePath });
      const loaded = engine2.getActiveFile();
      expect(loaded).toEqual(after);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
