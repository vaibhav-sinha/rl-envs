import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('DocumentEngine transaction rollback', () => {
  it('rolls back when second op has invalid gradient paint', async () => {
    const persistence = new JsonPersistence();
    const engine = new DocumentEngine({ persistence, logger: createConsoleLogger('error') });
    await engine.createEmptyFile({ fileName: 'PaintRollback' });
    await engine.applyTransaction([
      {
        op: 'createNode',
        parentId: 'I2',
        node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 40, height: 40, children: [] },
      },
    ]);
    const path = engine.getActiveFilePath()!;
    const before = await persistence.load({ path });
    const result = await engine.applyTransaction([
      {
        op: 'updateNode',
        nodeId: 'I3',
        patch: {
          fills: [
            {
              type: 'GRADIENT_LINEAR',
              gradientTransform: [
                [1, 0, 0],
                [0, 1, 0],
              ],
              gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0 } }],
            },
          ],
        },
      },
    ]);
    expect(result.success).toBe(false);
    const after = await persistence.load({ path });
    expect(after).toEqual(before);
  });
});
