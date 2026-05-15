import { describe, expect, it } from 'vitest';
import { applyEnvelopeOperation } from '../../src/engine/envelopeOps.js';
import type { FileEnvelope } from '../../src/model/types.js';

function envWithPaintStyles(): FileEnvelope {
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
    paintStyles: [],
  };
}

describe('phase8 style reorder', () => {
  it('moveLocalPaintStyleAfter reorders list', () => {
    const env = envWithPaintStyles();
    for (const [id, name] of [
      ['P1', 'A'],
      ['P2', 'B'],
      ['P3', 'C'],
    ] as const) {
      applyEnvelopeOperation(env, {
        op: 'createPaintStyle',
        id,
        name,
        paints: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
      });
    }
    applyEnvelopeOperation(env, { op: 'movePaintStyleAfter', targetId: 'P3', afterId: null });
    expect(env.paintStyles!.map((s) => s.id)).toEqual(['P3', 'P1', 'P2']);
    applyEnvelopeOperation(env, { op: 'movePaintStyleAfter', targetId: 'P3', afterId: 'P2' });
    expect(env.paintStyles!.map((s) => s.id)).toEqual(['P1', 'P2', 'P3']);
  });
});
