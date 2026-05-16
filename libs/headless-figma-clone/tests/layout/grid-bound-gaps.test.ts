import { describe, expect, it } from 'vitest';
import { computeGridTemplate } from '../../src/layout/gridLayout.js';
import type { FileEnvelope, FrameNode } from '../../src/model/types.js';

describe('grid bound gap css', () => {
  it('resolves gridRowGap from boundVariables', () => {
    const env: FileEnvelope = {
      schemaVersion: 1,
      fileName: 't',
      document: { id: 'D', type: 'DOCUMENT', name: 'Doc', children: [] },
      variableCollections: [
        {
          id: 'COL1',
          name: 'Vars',
          defaultModeId: 'M1',
          modes: [{ id: 'M1', name: 'Default' }],
          variables: [
            {
              id: 'VG',
              name: 'gap',
              resolvedType: 'FLOAT',
              valuesByMode: { M1: { type: 'FLOAT', value: 16 } },
            },
          ],
        },
      ],
      activeModeByCollectionId: { COL1: 'M1' },
    };
    const frame: FrameNode = {
      id: 'F1',
      type: 'FRAME',
      name: 'Grid',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      layoutMode: 'GRID',
      gridRowCount: 2,
      gridColumnCount: 2,
      gridRowGap: 8,
      boundVariables: { gridRowGap: 'VG' },
      children: [],
    };
    const t = computeGridTemplate(frame, [], env);
    expect(t.rowGap).toContain('var(--hfc-var-VG');
  });
});
