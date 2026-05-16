import { describe, expect, it } from 'vitest';
import { allEffectsCss } from '../../src/render/effectsCss.js';
import type { DropShadowEffect, FileEnvelope } from '../../src/model/types.js';

function miniEnv(): FileEnvelope {
  return {
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
            id: 'VR',
            name: 'shadowRadius',
            resolvedType: 'FLOAT',
            valuesByMode: { M1: { type: 'FLOAT', value: 12 } },
          },
          {
            id: 'VC',
            name: 'shadowColor',
            resolvedType: 'COLOR',
            valuesByMode: { M1: { type: 'COLOR', color: { r: 1, g: 0, b: 0 } } },
          },
          {
            id: 'VX',
            name: 'offsetX',
            resolvedType: 'FLOAT',
            valuesByMode: { M1: { type: 'FLOAT', value: 4 } },
          },
        ],
      },
    ],
    activeModeByCollectionId: { COL1: 'M1' },
  };
}

describe('effect variable compile resolution', () => {
  it('emits var() for bound shadow radius, offset, and color', () => {
    const effect: DropShadowEffect = {
      type: 'DROP_SHADOW',
      offset: { x: 0, y: 2 },
      radius: 8,
      spread: 0,
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      blendMode: 'NORMAL',
      boundVariables: {
        radius: { type: 'VARIABLE_ALIAS', id: 'VR' },
        color: { type: 'VARIABLE_ALIAS', id: 'VC' },
        offsetX: { type: 'VARIABLE_ALIAS', id: 'VX' },
      },
    };
    const env = miniEnv();
    const css = allEffectsCss([effect], { env }, [], 'test');
    expect(css).toContain('var(--hfc-var-VR');
    expect(css).toContain('var(--hfc-var-VC');
    expect(css).toContain('var(--hfc-var-VX');
    expect(css).toContain('box-shadow:');
  });
});
