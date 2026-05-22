import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { applyCreateNodeOp, DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { createConsoleLogger } from '../../src/util/logger.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('useFigmaScript parent index perf', () => {
  it('findAll with parent predicate completes quickly on a medium tree', async () => {
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
    }

    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-parent-perf-'));
    const filePath = join(baseDir, 'perf.hfc.json');
    writeFileSync(filePath, JSON.stringify(env));

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.loadFromDisk({ absolutePath: filePath, save: false });

    const t0 = performance.now();
    const run = await runUseFigmaScript(
      `
const page = figma.currentPage;
const hits = page.findAll((n) => n.parent?.name === 'Components');
return hits.length;
`.trim(),
      engine
    );
    const ms = performance.now() - t0;
    rmSync(baseDir, { recursive: true, force: true });

    expect(run.kind).toBe('ok');
    if (run.kind === 'ok') {
      expect(run.result).toBe(200);
    }
    expect(ms).toBeLessThan(500);
  });
});
