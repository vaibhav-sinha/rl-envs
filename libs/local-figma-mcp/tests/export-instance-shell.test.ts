import { describe, expect, it } from 'vitest';
import {
  enrichInstanceNodeExport,
  exportInstanceOverridesRecord,
  getInstanceShellOverriddenPaintFields,
} from '../plugin/src/tools/exportFile.js';

function mockInstance(
  id: string,
  fields: {
    fills?: unknown;
    strokes?: unknown;
    backgrounds?: unknown;
    effects?: unknown;
    overrides?: unknown;
  }
): InstanceNode {
  return {
    id,
    name: 'Button',
    type: 'INSTANCE',
    ...fields,
  } as unknown as InstanceNode;
}

describe('instance shell export', () => {
  it('getInstanceShellOverriddenPaintFields reads overrides array', () => {
    const inst = mockInstance('15756:484766', {
      overrides: [{ id: '15756:484766', overriddenFields: ['fills', 'strokes'] }],
    });
    expect([...getInstanceShellOverriddenPaintFields(inst)]).toEqual(['fills', 'strokes']);
  });

  it('enrich writes [] when overrides list cleared paints but API returns undefined', () => {
    const inst = mockInstance('15756:484766', {
      fills: undefined,
      strokes: undefined,
      overrides: [
        { id: '15756:484766', overriddenFields: ['fills', 'strokes', 'backgrounds', 'effects'] },
      ],
    });
    const props: Record<string, unknown> = {};
    enrichInstanceNodeExport(inst, props);
    expect(props.fills).toEqual([]);
    expect(props.strokes).toEqual([]);
    expect(props.backgrounds).toEqual([]);
    expect(props.effects).toEqual([]);
  });

  it('exportInstanceOverridesRecord writes map with [] for cleared shell fields', () => {
    const inst = mockInstance('15756:484766', {
      fills: undefined,
      strokes: undefined,
      overrides: [{ id: '15756:484766', overriddenFields: ['fills', 'strokes'] }],
    });
    const props: Record<string, unknown> = {};
    const visited = new WeakSet<object>();
    exportInstanceOverridesRecord(inst, props, visited);
    expect(props.overrides).toEqual({
      '15756:484766': { fills: [], strokes: [] },
    });
  });
});
