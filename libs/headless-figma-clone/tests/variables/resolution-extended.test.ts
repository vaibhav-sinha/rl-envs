import { describe, expect, it } from 'vitest';
import { applyEnvelopeOperation } from '../../src/engine/envelopeOps.js';
import {
  buildRootCssVariableBlock,
  resolveVariableToFloat,
  resolveVariableToStringValue,
} from '../../src/variables/resolution.js';
import { emptyEnvelope } from '../helpers/envelope.js';

function seed(env: ReturnType<typeof emptyEnvelope>) {
  applyEnvelopeOperation(env, {
    op: 'createVariableCollection',
    collectionId: 'VC1',
    name: 'T',
    defaultModeId: 'VM1',
  });
}

describe('variable resolution extended', () => {
  it('resolveVariableToFloat and resolveVariableToStringValue', () => {
    const env = emptyEnvelope();
    seed(env);
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VF1',
      name: 'space',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VS1',
      name: 'label',
      resolvedType: 'STRING',
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableValueForMode',
      variableId: 'VF1',
      modeId: 'VM1',
      value: { type: 'FLOAT', value: 12 },
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableValueForMode',
      variableId: 'VS1',
      modeId: 'VM1',
      value: { type: 'STRING', value: 'Hello' },
    });
    expect(resolveVariableToFloat(env, 'VF1')).toBe(12);
    expect(resolveVariableToStringValue(env, 'VS1')).toBe('Hello');
    expect(resolveVariableToFloat(env, 'VS1')).toBeNull();
  });

  it('buildRootCssVariableBlock emits float px and string JSON', () => {
    const env = emptyEnvelope();
    seed(env);
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VF1',
      name: 'gap',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VS1',
      name: 'title',
      resolvedType: 'STRING',
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableValueForMode',
      variableId: 'VF1',
      modeId: 'VM1',
      value: { type: 'FLOAT', value: 8 },
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableValueForMode',
      variableId: 'VS1',
      modeId: 'VM1',
      value: { type: 'STRING', value: 'Hi' },
    });
    const block = buildRootCssVariableBlock(env);
    expect(block).toContain('--hfc-var-VF1:8px');
    expect(block).toContain('--hfc-var-VS1:"Hi"');
  });
});
