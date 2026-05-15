import { describe, expect, it } from 'vitest';
import { applyEnvelopeOperation } from '../../src/engine/envelopeOps.js';
import { findVariableDefinition, resolveVariableToFloat } from '../../src/variables/resolution.js';
import { emptyEnvelope } from '../helpers/envelope.js';

function seedCollection(env: ReturnType<typeof emptyEnvelope>) {
  applyEnvelopeOperation(env, {
    op: 'createVariableCollection',
    collectionId: 'VC1',
    name: 'Tokens',
    defaultModeId: 'VM1',
  });
}

describe('envelopeOps extended', () => {
  it('createVariableMode adds default values for existing variables', () => {
    const env = emptyEnvelope();
    seedCollection(env);
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV1',
      name: 'space/md',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, {
      op: 'createVariableMode',
      collectionId: 'VC1',
      modeId: 'VM2',
      name: 'Dark',
    });
    const hit = findVariableDefinition(env, 'VV1');
    expect(hit?.variable.valuesByMode.VM2).toEqual({ type: 'FLOAT', value: 0 });
  });

  it('renameVariable updates name', () => {
    const env = emptyEnvelope();
    seedCollection(env);
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV1',
      name: 'old',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, { op: 'renameVariable', variableId: 'VV1', name: 'new' });
    expect(findVariableDefinition(env, 'VV1')?.variable.name).toBe('new');
  });

  it('setVariableCollectionActiveMode switches active mode', () => {
    const env = emptyEnvelope();
    seedCollection(env);
    applyEnvelopeOperation(env, {
      op: 'createVariableMode',
      collectionId: 'VC1',
      modeId: 'VM2',
      name: 'Alt',
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableCollectionActiveMode',
      collectionId: 'VC1',
      modeId: 'VM2',
    });
    expect(env.activeModeByCollectionId?.VC1).toBe('VM2');
  });

  it('setVariableAliasTarget resolves through alias chain', () => {
    const env = emptyEnvelope();
    seedCollection(env);
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV_BASE',
      name: 'base',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV_ALIAS',
      name: 'alias',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableValueForMode',
      variableId: 'VV_BASE',
      modeId: 'VM1',
      value: { type: 'FLOAT', value: 24 },
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableAliasTarget',
      variableId: 'VV_ALIAS',
      aliasOfVariableId: 'VV_BASE',
    });
    expect(resolveVariableToFloat(env, 'VV_ALIAS')).toBe(24);
  });

  it('rejects self-alias and setValue on alias variable', () => {
    const env = emptyEnvelope();
    seedCollection(env);
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV1',
      name: 'v',
      resolvedType: 'FLOAT',
    });
    expect(() =>
      applyEnvelopeOperation(env, {
        op: 'setVariableAliasTarget',
        variableId: 'VV1',
        aliasOfVariableId: 'VV1',
      })
    ).toThrow(/cannot alias itself/);

    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV2',
      name: 'v2',
      resolvedType: 'FLOAT',
    });
    applyEnvelopeOperation(env, {
      op: 'setVariableAliasTarget',
      variableId: 'VV2',
      aliasOfVariableId: 'VV1',
    });
    expect(() =>
      applyEnvelopeOperation(env, {
        op: 'setVariableValueForMode',
        variableId: 'VV2',
        modeId: 'VM1',
        value: { type: 'FLOAT', value: 1 },
      })
    ).toThrow(/alias variable/);
  });

  it('deleteVariableCollection rejects when variables are bound', () => {
    const env = emptyEnvelope();
    seedCollection(env);
    applyEnvelopeOperation(env, {
      op: 'createVariable',
      collectionId: 'VC1',
      variableId: 'VV1',
      name: 'pad',
      resolvedType: 'FLOAT',
    });
    env.document.children[0]!.children.push({
      id: 'I3',
      type: 'FRAME',
      name: 'F',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      boundVariables: { paddingLeft: 'VV1' },
      children: [],
    });
    expect(() =>
      applyEnvelopeOperation(env, { op: 'deleteVariableCollection', collectionId: 'VC1' })
    ).toThrow(/in use/);
  });

  it('creates and updates text and effect styles', () => {
    const env = emptyEnvelope();
    applyEnvelopeOperation(env, {
      op: 'createTextStyle',
      id: 'TS1',
      name: 'Body',
      spec: { fontSize: 14, fontWeight: 500 },
    });
    applyEnvelopeOperation(env, {
      op: 'createEffectStyle',
      id: 'ES1',
      name: 'Shadow',
      effects: [
        {
          type: 'DROP_SHADOW',
          offset: { x: 0, y: 2 },
          radius: 4,
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          blendMode: 'NORMAL',
        },
      ],
    });
    applyEnvelopeOperation(env, {
      op: 'updateTextStyle',
      id: 'TS1',
      patch: { fontSize: 16 },
    });
    expect(env.textStyles?.[0]?.fontSize).toBe(16);
    expect(env.effectStyles?.[0]?.effects[0]?.type).toBe('DROP_SHADOW');
  });

  it('moveTextStyleAfter reorders text styles', () => {
    const env = emptyEnvelope();
    for (const [id, name] of [
      ['T1', 'A'],
      ['T2', 'B'],
    ] as const) {
      applyEnvelopeOperation(env, { op: 'createTextStyle', id, name });
    }
    applyEnvelopeOperation(env, { op: 'moveTextStyleAfter', targetId: 'T2', afterId: null });
    expect(env.textStyles!.map((s) => s.id)).toEqual(['T2', 'T1']);
  });
});
