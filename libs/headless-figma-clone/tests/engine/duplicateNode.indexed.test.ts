import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, DocumentEngine, duplicateNodeInEnvelope } from '../../src/engine/DocumentEngine.js';
import { buildGraphIndexes } from '../../src/engine/nodeIndex.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('duplicateNode indexed perf', () => {
  it('50 duplicates with graph indexes completes quickly on a medium tree', async () => {
    const env = emptyEnvelope(5000);
    const pid = pageId(env);
    const componentsId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'FRAME',
        name: 'Components',
        x: 0,
        y: 0,
        width: 400,
        height: 400,
        children: [],
      },
    });
    let sourceId = componentsId;
    for (let i = 0; i < 200; i++) {
      const frameId = applyCreateNodeOp(env, {
        op: 'createNode',
        parentId: componentsId,
        node: {
          type: 'FRAME',
          name: `Item${String(i)}`,
          x: 0,
          y: 0,
          width: 40,
          height: 20,
          children: [],
        },
      });
      for (let j = 0; j < 3; j++) {
        applyCreateNodeOp(env, {
          op: 'createNode',
          parentId: frameId,
          node: {
            type: 'RECTANGLE',
            name: `R${String(i)}_${String(j)}`,
            x: 0,
            y: 0,
            width: 4,
            height: 4,
          },
        });
      }
      if (i === 0) sourceId = frameId;
    }

    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-dup-indexed-'));
    const filePath = join(baseDir, 'perf.hfc.json');
    writeFileSync(filePath, JSON.stringify(env));

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.loadFromDisk({ absolutePath: filePath, save: false });
    const working = engine.getActiveFile()!;
    const graph = buildGraphIndexes(working);
    const ctx = { indexes: graph };

    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      duplicateNodeInEnvelope(working, sourceId, ctx);
    }
    const ms = performance.now() - t0;
    rmSync(baseDir, { recursive: true, force: true });

    expect(ms).toBeLessThan(500);
  });
});
