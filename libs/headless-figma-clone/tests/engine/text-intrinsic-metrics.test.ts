import { describe, expect, it } from 'vitest';
import { applyEngineOp } from '../../src/engine/DocumentEngine.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

describe('TEXT intrinsic metrics in engine', () => {
  it('sets height > 0 after characters patch with textAutoResize HEIGHT', () => {
    const env = emptyEnvelope(100);
    const pid = pageId(env);
    const textId = applyEngineOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'TEXT',
        name: 'Msg',
        width: 328,
        height: 0,
        characters: '',
        fontSize: 16,
        textAutoResize: 'HEIGHT',
        layoutSizingHorizontal: 'FIXED',
        layoutSizingVertical: 'HUG',
      },
    })!;

    applyEngineOp(env, {
      op: 'updateNode',
      nodeId: textId,
      patch: {
        characters:
          'You have reached your max attempts. Retry OTP generation after 15:00 minutes',
      },
    });

    const node = env.document.children[0]!.children.find((c) => c.id === textId);
    expect(node?.type).toBe('TEXT');
    if (node?.type === 'TEXT') {
      expect(node.height).toBeGreaterThan(0);
    }
  });
});
