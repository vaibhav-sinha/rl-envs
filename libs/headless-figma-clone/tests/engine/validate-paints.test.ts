import { describe, expect, it } from 'vitest';
import { assertPaint, validatePaintArray } from '../../src/engine/validatePaints.js';
import { ValidationErr } from '../../src/util/errors.js';
import { emptyEnvelope } from '../helpers/envelope.js';

describe('validatePaints', () => {
  const env = emptyEnvelope();

  it('accepts valid SOLID paint', () => {
    const p = assertPaint({ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }, 'fills[0]', env);
    expect(p.type).toBe('SOLID');
  });

  it('maps SOLID color.a to paint opacity', () => {
    const p = assertPaint(
      { type: 'SOLID', color: { r: 0.88, g: 0.9, b: 0.95, a: 0.5 } },
      'fills[0]',
      env
    );
    expect(p.type).toBe('SOLID');
    if (p.type !== 'SOLID') return;
    expect(p.opacity).toBe(0.5);
  });

  it('rejects SOLID with out-of-range RGB', () => {
    expect(() =>
      assertPaint({ type: 'SOLID', color: { r: 2, g: 0, b: 0 } }, 'fills[0]', env)
    ).toThrow(ValidationErr);
  });

  it('rejects gradient with fewer than 2 stops', () => {
    expect(() =>
      assertPaint(
        {
          type: 'GRADIENT_LINEAR',
          gradientTransform: [
            [1, 0, 0],
            [0, 1, 0],
          ],
          gradientStops: [{ position: 0, color: { r: 0, g: 0, b: 0 } }],
        },
        'fills[0]',
        env
      )
    ).toThrow(/at least 2 stops/);
  });

  it('rejects gradient stop position outside 0..1', () => {
    expect(() =>
      assertPaint(
        {
          type: 'GRADIENT_LINEAR',
          gradientTransform: [
            [1, 0, 0],
            [0, 1, 0],
          ],
          gradientStops: [
            { position: 0, color: { r: 0, g: 0, b: 0 } },
            { position: 1.5, color: { r: 1, g: 1, b: 1 } },
          ],
        },
        'fills[0]',
        env
      )
    ).toThrow(/position must be 0..1/);
  });

  it('rejects IMAGE paint with unknown hash', () => {
    expect(() =>
      assertPaint({ type: 'IMAGE', imageHash: 'deadbeef'.repeat(8), scaleMode: 'FILL' }, 'fills[0]', env)
    ).toThrow(/unknown imageHash/);
  });

  it('accepts IMAGE paint when asset is registered', () => {
    const hash = 'a'.repeat(64);
    env.assets = {
      byId: {
        [hash]: { id: hash, sha256: hash, mimeType: 'image/png', byteLength: 4 },
      },
    };
    const p = assertPaint({ type: 'IMAGE', imageHash: hash, scaleMode: 'FIT' }, 'fills[0]', env);
    expect(p.type).toBe('IMAGE');
    if (p.type === 'IMAGE') expect(p.scaleMode).toBe('FIT');
  });

  it('rejects PATTERN with missing source node', () => {
    expect(() =>
      assertPaint(
        { type: 'PATTERN', sourceNodeId: 'I999', tileType: 'RECTANGULAR', scalingFactor: 1 },
        'fills[0]',
        env
      )
    ).toThrow(/sourceNodeId not found/);
  });

  it('accepts PATTERN when source exists', () => {
    const env2 = emptyEnvelope();
    const pid = env2.document.children[0]!.id;
    env2.document.children[0]!.children.push({
      id: 'I3',
      type: 'RECTANGLE',
      name: 'Src',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      visible: true,
    });
    const p = assertPaint(
      { type: 'PATTERN', sourceNodeId: 'I3', tileType: 'RECTANGULAR', scalingFactor: 2 },
      'fills[0]',
      env2
    );
    expect(p.type).toBe('PATTERN');
  });

  it('rejects VARIABLE_COLOR for unknown or wrong-type variable', () => {
    expect(() =>
      assertPaint({ type: 'VARIABLE_COLOR', variableId: 'VV_MISSING' }, 'fills[0]', env)
    ).toThrow(/unknown variableId/);

    env.variableCollections = [
      {
        id: 'VC1',
        name: 'T',
        defaultModeId: 'VM1',
        modes: [{ id: 'VM1', name: 'Mode 1' }],
        variables: [
          {
            id: 'VF1',
            name: 'space',
            resolvedType: 'FLOAT',
            valuesByMode: { VM1: { type: 'FLOAT', value: 8 } },
          },
        ],
      },
    ];
    expect(() =>
      assertPaint({ type: 'VARIABLE_COLOR', variableId: 'VF1' }, 'fills[0]', env)
    ).toThrow(/not COLOR/);
  });

  it('validatePaintArray rejects non-array input', () => {
    expect(() => validatePaintArray('nope', 'fills', env)).toThrow(/must be array/);
  });
});
