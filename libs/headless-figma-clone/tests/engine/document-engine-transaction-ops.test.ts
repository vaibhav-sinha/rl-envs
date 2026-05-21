import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

describe('DocumentEngine applyTransaction scene graph ops', () => {
  it('replays duplicateNode', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DupReplay' });
    await engine.applyTransaction([
      {
        op: 'createNode',
        parentId: 'I2',
        node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 10, height: 10 },
      },
    ]);

    const tx = await engine.applyTransaction([{ op: 'duplicateNode', nodeId: 'I3' }]);
    expect(tx.success).toBe(true);

    const page = engine.getActiveFile()!.document.children[0]!;
    const rects = page.children.filter((c) => c.type === 'RECTANGLE');
    expect(rects).toHaveLength(2);
  });

  it('replays duplicateNode then moveNode in one transaction', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'DupMove' });
    await engine.applyTransaction([
      {
        op: 'createNode',
        parentId: 'I2',
        node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 10, height: 10 },
      },
      {
        op: 'createNode',
        parentId: 'I2',
        node: { type: 'FRAME', name: 'Dest', x: 0, y: 0, width: 100, height: 100, children: [] },
      },
    ]);

    const file = engine.getActiveFile()!;
    const page = file.document.children[0]!;
    const sourceId = page.children.find((c) => c.type === 'RECTANGLE')!.id;
    const destId = page.children.find((c) => c.type === 'FRAME')!.id;

    const dupTx = await engine.applyTransaction([{ op: 'duplicateNode', nodeId: sourceId }]);
    expect(dupTx.success).toBe(true);

    const cloneId = engine
      .getActiveFile()!
      .document.children[0]!.children.find((c) => c.type === 'RECTANGLE' && c.id !== sourceId)!.id;

    const moveTx = await engine.applyTransaction([
      { op: 'moveNode', nodeId: cloneId, newParentId: destId },
    ]);
    expect(moveTx.success).toBe(true);

    const dest = engine.getActiveFile()!.document.children[0]!.children.find((c) => c.id === destId);
    expect(dest?.type).toBe('FRAME');
    expect(dest && 'children' in dest ? dest.children.length : 0).toBe(1);
  });
});
