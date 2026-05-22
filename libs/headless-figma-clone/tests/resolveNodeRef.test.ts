import { describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../src/model/types.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../src/resolveNodeRef.js';

function minimalEnvelope(overrides?: Partial<FileEnvelope>): FileEnvelope {
  return {
    schemaVersion: 1,
    fileKey: 'test',
    fileName: 'Test',
    nextInternalId: 10,
    document: {
      id: 'I1',
      type: 'DOCUMENT',
      name: 'Document',
      sourceFigmaId: '0:0',
      children: [
        {
          id: 'I2',
          type: 'PAGE',
          name: 'Page',
          sourceFigmaId: '0:1',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          children: [
            {
              id: 'I3',
              type: 'FRAME',
              name: 'Screen',
              sourceFigmaId: '1:2',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              children: [],
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe('resolveHfcNodeIdBySourceFigmaId', () => {
  it('maps sourceFigmaId to HFC id', () => {
    const env = minimalEnvelope();
    expect(resolveHfcNodeIdBySourceFigmaId(env, '1:2')).toBe('I3');
    expect(resolveHfcNodeIdBySourceFigmaId(env, '0:1')).toBe('I2');
  });

  it('returns null for unknown figma id', () => {
    expect(resolveHfcNodeIdBySourceFigmaId(minimalEnvelope(), 'missing:99')).toBeNull();
  });

  it('prefers component when duplicate sourceFigmaId', () => {
    const env = minimalEnvelope({
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            children: [
              {
                id: 'I3',
                type: 'FRAME',
                name: 'Frame',
                sourceFigmaId: '9:9',
                x: 0,
                y: 0,
                width: 10,
                height: 10,
                children: [],
              },
              {
                id: 'I4',
                type: 'COMPONENT',
                name: 'Comp',
                sourceFigmaId: '9:9',
                x: 0,
                y: 0,
                width: 20,
                height: 20,
                children: [],
              },
            ],
          },
        ],
      },
    });
    expect(resolveHfcNodeIdBySourceFigmaId(env, '9:9')).toBe('I4');
  });
});
