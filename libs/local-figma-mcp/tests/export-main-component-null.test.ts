import { describe, expect, it } from 'vitest';
import { drainInstanceExportDebug } from '../plugin/src/tools/instanceExportDebug.js';
import { serializeNodeProperties } from '../plugin/src/tools/exportFile.js';

describe('instance mainComponent export logging', () => {
  it('logs when mainComponent is null and does not write mainComponentId', () => {
    drainInstanceExportDebug();
    const inst = {
      id: '300:3',
      name: 'Divider',
      type: 'INSTANCE',
      mainComponent: null,
      componentProperties: {
        Type: { type: 'VARIANT', value: 'Small' },
      },
    } as unknown as InstanceNode;

    const props = serializeNodeProperties(inst as BaseNode & Record<string, unknown>);
    expect(props.mainComponentId).toBeUndefined();
    const lines = drainInstanceExportDebug();
    expect(lines.some((l) => l.includes('300:3') && l.includes('mainComponent=null'))).toBe(true);
  });
});
