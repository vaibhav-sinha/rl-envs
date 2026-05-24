import { describe, expect, it } from 'vitest';
import { detachInstanceInEnvelope } from '../../src/engine/DocumentEngine.js';
import { resolveNodeInEnvelope } from '../../src/engine/componentResolve.js';
import type { FrameNode } from '../../src/model/types.js';
import { emptyEnvelope } from '../helpers/envelope.js';

describe('detachInstanceInEnvelope stored children fallback', () => {
  it('succeeds when mainComponentId is bogus but children are populated', () => {
    const env = emptyEnvelope();
    const instId = 'I38349';
    env.document.children[0]!.children.push({
      id: instId,
      type: 'INSTANCE',
      name: 'Category/L3',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      mainComponentId: 'I0',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true, opacity: 1, blendMode: 'NORMAL' }],
      children: [
        {
          id: 'I38350',
          type: 'FRAME',
          name: 'Row',
          x: 0,
          y: 0,
          width: 100,
          height: 40,
          children: [
            {
              id: 'I38351',
              type: 'RECTANGLE',
              name: 'Icon',
              x: 0,
              y: 0,
              width: 16,
              height: 16,
            },
          ],
        },
      ],
    });

    const frameId = detachInstanceInEnvelope(env, instId);
    expect(frameId).toBe(instId);

    const detached = resolveNodeInEnvelope(env, instId);
    expect(detached?.type).toBe('FRAME');
    expect((detached as FrameNode).children.length).toBeGreaterThan(0);
  });

  it('throws when master and stored children are both missing', () => {
    const env = emptyEnvelope();
    const instId = 'I90';
    env.document.children[0]!.children.push({
      id: instId,
      type: 'INSTANCE',
      name: 'Empty',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      mainComponentId: 'I_missing',
    });

    expect(() => detachInstanceInEnvelope(env, instId)).toThrow(/mainComponentId missing/);
  });
});
