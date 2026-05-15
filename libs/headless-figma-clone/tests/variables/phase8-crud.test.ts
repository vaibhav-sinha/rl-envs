import { describe, expect, it } from 'vitest';
import { applyEnvelopeOperation } from '../../src/engine/envelopeOps.js';
import type { FileEnvelope } from '../../src/model/types.js';
import { findVariableDefinition } from '../../src/variables/resolution.js';

function emptyEnv(): FileEnvelope {
  return {
    schemaVersion: 1,
    fileKey: 't',
    fileName: 't',
    nextInternalId: 10,
    document: {
      id: 'I1',
      type: 'DOCUMENT',
      name: 'Document',
      children: [{ id: 'I2', type: 'PAGE', name: 'Page 1', children: [] }],
    },
  };
}

describe('phase8 variables CRUD', () => {
  it('create collection → mode → variable → set value → delete', () => {
    const env = emptyEnv();
    applyEnvelopeOperation(env, {
      op: 'createVariableCollection',
      collectionId: 'VC1',
      name: 'Tokens',
      defaultModeId: 'VM1',
    });
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV1',
      name: 'space/md',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableValueForMode',
      variableId: 'VV1',
      modeId: 'VM1',
      value: { type: 'FLOAT', value: 16 },
    });
    const hit = findVariableDefinition(env, 'VV1');
    expect(hit?.variable.valuesByMode.VM1).toEqual({ type: 'FLOAT', value: 16 });
    applyEnvelopeOperation(env, { op: 'deleteVariable', variableId: 'VV1' });
    expect(findVariableDefinition(env, 'VV1')).toBeNull();
  });

  it('rejects delete when variable is bound on a node', () => {
    const env = emptyEnv();
    applyEnvelopeOperation(env, {
      op: 'createVariableCollection',
      collectionId: 'VC1',
      name: 'Tokens',
      defaultModeId: 'VM1',
    });
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV1',
      name: 'space/md',
      resolvedType: 'FLOAT',
    });
    env.document.children[0]!.children.push({
      id: 'I3',
      type: 'FRAME',
      name: 'F',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      boundVariables: { paddingLeft: 'VV1' },
      children: [],
    });
    expect(() => applyEnvelopeOperation(env, { op: 'deleteVariable', variableId: 'VV1' })).toThrow(/in use/);
  });
});
