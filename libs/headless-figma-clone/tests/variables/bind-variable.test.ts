import { describe, expect, it } from 'vitest';
import { applyEnvelopeOperation } from '../../src/engine/envelopeOps.js';
import { bindVariableToNodeField } from '../../src/variables/VariablesAPI.js';
import { ValidationErr } from '../../src/util/errors.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

function seedFloatVar(env: ReturnType<typeof emptyEnvelope>, id = 'VV1') {
  applyEnvelopeOperation(env, {
    op: 'createVariableCollection',
    collectionId: 'VC1',
    name: 'T',
    defaultModeId: 'VM1',
  });
  applyEnvelopeOperation(env, {
    op: 'createVariable',
    collectionId: 'VC1',
    variableId: id,
    name: 'space',
    resolvedType: 'FLOAT',
  });
}

describe('bindVariableToNodeField', () => {
  it('binds FLOAT to frame padding and unbinds', () => {
    const env = emptyEnvelope();
    seedFloatVar(env);
    const pid = pageId(env);
    env.document.children[0]!.children.push({
      id: 'I3',
      type: 'FRAME',
      name: 'F',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [],
    });
    const patch = bindVariableToNodeField(env, 'I3', 'paddingTop', { id: 'VV1' });
    expect(patch.boundVariables).toEqual({ paddingTop: 'VV1' });
    const unbind = bindVariableToNodeField(env, 'I3', 'paddingTop', null);
    expect(unbind.boundVariables).toBeUndefined();
  });

  it('rejects wrong resolved type for field', () => {
    const env = emptyEnvelope();
    applyEnvelopeOperation(env, {
      op: 'createVariableCollection',
      collectionId: 'VC1',
      name: 'T',
      defaultModeId: 'VM1',
    });
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VS1',
      name: 'label',
      resolvedType: 'STRING',
    });
    env.document.children[0]!.children.push({
      id: 'I3',
      type: 'FRAME',
      name: 'F',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [],
    });
    expect(() => bindVariableToNodeField(env, 'I3', 'paddingTop', { id: 'VS1' })).toThrow(/requires FLOAT/);
  });

  it('rejects bind on unsupported node types', () => {
    const env = emptyEnvelope();
    seedFloatVar(env);
    env.document.children[0]!.children.push({
      id: 'I3',
      type: 'RECTANGLE',
      name: 'R',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      visible: true,
    });
    expect(() => bindVariableToNodeField(env, 'I3', 'paddingTop', { id: 'VV1' })).toThrow(ValidationErr);
  });
});
