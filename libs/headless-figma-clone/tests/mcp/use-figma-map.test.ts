import { describe, expect, it } from 'vitest';
import { mapUseFigmaToEngineOperations } from '../../src/mcp/useFigmaMap.js';

describe('mapUseFigmaToEngineOperations', () => {
  it('maps create, update, delete, and move operations', () => {
    const ops = mapUseFigmaToEngineOperations([
      {
        operation: 'createNode',
        parentId: 'I2',
        index: 0,
        node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 10, height: 10, children: [] },
      },
      { operation: 'updateNode', nodeId: 'I3', properties: { name: 'Renamed' } },
      { operation: 'deleteNode', nodeId: 'I4' },
      { operation: 'moveNode', nodeId: 'I5', newParentId: 'I3', index: 1 },
    ]);
    expect(ops).toHaveLength(4);
    expect(ops[0]).toMatchObject({ op: 'createNode', parentId: 'I2' });
    expect(ops[1]).toMatchObject({ op: 'updateNode', patch: { name: 'Renamed' } });
    expect(ops[2]).toMatchObject({ op: 'deleteNode', nodeId: 'I4' });
    expect(ops[3]).toMatchObject({ op: 'moveNode', newParentId: 'I3', index: 1 });
  });

  it('rejects invalid payloads', () => {
    expect(() => mapUseFigmaToEngineOperations([{ operation: 'nope' }])).toThrow(/Unsupported operation/);
    expect(() => mapUseFigmaToEngineOperations([{ operation: 'createNode' }])).toThrow(/parentId required/);
    expect(() =>
      mapUseFigmaToEngineOperations([
        { operation: 'createNode', parentId: 'I2', node: { type: 'NOT_A_TYPE' } },
      ])
    ).toThrow(/createNode.node.type/);
    expect(() =>
      mapUseFigmaToEngineOperations([
        { operation: 'moveNode', nodeId: 'I3', newParentId: 'I2', index: 1.5 },
      ])
    ).toThrow(/index invalid/);
  });
});
