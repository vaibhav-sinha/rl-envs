import { describe, expect, it } from 'vitest';
import { applyEngineOp } from '../../src/engine/DocumentEngine.js';
import { resolveNodeInEnvelope } from '../../src/engine/componentResolve.js';
import type { FrameNode } from '../../src/model/types.js';
import { emptyEnvelope } from '../helpers/envelope.js';

describe('clipped frame resize', () => {
  it('scales direct child geometry when a clipsContent frame is resized', () => {
    const env = emptyEnvelope();
    const frameId = 'I1000';
    env.document.children[0]!.children.push({
      id: frameId,
      type: 'FRAME',
      name: 'IconWrap',
      x: 0,
      y: 0,
      width: 64,
      height: 64,
      clipsContent: true,
      children: [
        {
          id: 'I1001',
          type: 'RECTANGLE',
          name: 'Icon',
          x: 8,
          y: 8,
          width: 48,
          height: 48,
        },
      ],
    });

    applyEngineOp(env, {
      op: 'updateNode',
      nodeId: frameId,
      patch: { width: 32, height: 32 },
    });

    const frame = resolveNodeInEnvelope(env, frameId) as FrameNode;
    const rect = frame.children[0]!;
    expect(rect.x).toBeCloseTo(4);
    expect(rect.y).toBeCloseTo(4);
    expect(rect.width).toBeCloseTo(24);
    expect(rect.height).toBeCloseTo(24);
  });
});
