import { describe, expect, it } from 'vitest';
import {
  applyCreateNodeOp,
  applyEngineOp,
  findEnvelopeNode,
} from '../../src/engine/DocumentEngine.js';
import { ValidationErr } from '../../src/util/errors.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

function styledText(characters: string) {
  const len = characters.length;
  return {
    type: 'TEXT' as const,
    name: 'T',
    x: 0,
    y: 0,
    width: 80,
    height: 24,
    characters,
    fontSize: 16,
    fontWeight: 400,
    styledSegments: [{ start: 0, end: len, style: { fontSize: 16 } }],
    visible: true,
  };
}

describe('DocumentEngine validation and ops', () => {
  it('rejects unsupported patch keys on node type', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const rectId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 10, height: 10 },
    });
    expect(() =>
      applyEngineOp(env, {
        op: 'updateNode',
        nodeId: rectId,
        patch: { layoutMode: 'HORIZONTAL' },
      })
    ).toThrow(ValidationErr);
    expect(() =>
      applyEngineOp(env, {
        op: 'updateNode',
        nodeId: rectId,
        patch: { layoutMode: 'HORIZONTAL' },
      })
    ).toThrow(/Unsupported patch key/);
  });

  it('rejects forbidden patch keys id, type, children', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 50, height: 50, children: [] },
    });
    for (const key of ['id', 'type', 'children'] as const) {
      expect(() =>
        applyEngineOp(env, { op: 'updateNode', nodeId: frameId, patch: { [key]: 'x' } })
      ).toThrow(/Forbidden key/);
    }
  });

  it('rejects createNode when parent/child pair is invalid', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const textId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: styledText('hi'),
    });
    expect(() =>
      applyCreateNodeOp(env, {
        op: 'createNode',
        parentId: textId,
        node: { type: 'RECTANGLE', name: 'R', x: 0, y: 0, width: 10, height: 10 },
      })
    ).toThrow(/Cannot create RECTANGLE under TEXT/);
  });

  it('allocates sequential internal ids from nextInternalId', () => {
    const env = emptyEnvelope(10);
    const pid = pageId(env);
    const a = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'A', x: 0, y: 0, width: 1, height: 1 },
    });
    const b = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'B', x: 0, y: 0, width: 1, height: 1 },
    });
    expect(a).toBe('I10');
    expect(b).toBe('I11');
    expect(env.nextInternalId).toBe(12);
  });

  it('rejects negative frame dimensions', () => {
    const env = emptyEnvelope();
    expect(() =>
      applyCreateNodeOp(env, {
        op: 'createNode',
        parentId: pageId(env),
        node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: -1, height: 10, children: [] },
      })
    ).toThrow(/width\/height must be >= 0/);
  });

  it('rejects invalid layoutMode on frame patch', () => {
    const env = emptyEnvelope();
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pageId(env),
      node: { type: 'FRAME', name: 'F', x: 0, y: 0, width: 40, height: 40, children: [] },
    });
    expect(() =>
      applyEngineOp(env, {
        op: 'updateNode',
        nodeId: frameId,
        patch: { layoutMode: 'DIAGONAL' },
      })
    ).toThrow(/layoutMode/);
  });

  it('moveNode reparents child and preserves id', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const frameId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'Shell', x: 0, y: 0, width: 100, height: 100, children: [] },
    });
    const rectId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'RECTANGLE', name: 'R', x: 5, y: 5, width: 20, height: 20 },
    });
    applyEngineOp(env, { op: 'moveNode', nodeId: rectId, newParentId: frameId, index: 0 });
    const frame = findEnvelopeNode(env, frameId);
    expect(frame?.type).toBe('FRAME');
    if (frame?.type === 'FRAME') {
      expect(frame.children.map((c) => c.id)).toEqual([rectId]);
    }
    expect(findEnvelopeNode(env, pid)?.type).toBe('PAGE');
  });

  it('deleteNode on COMPONENT_SET removes instances referencing the set', () => {
    const env = emptyEnvelope(100);
    const pid = pageId(env);
    const rootA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'FRAME', name: 'RootA', x: 0, y: 0, width: 50, height: 20, children: [] },
    });
    const compA = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'COMPONENT', name: 'A', x: 0, y: 0, width: 50, height: 20, rootFrameId: rootA },
    });
    const setId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'COMPONENT_SET',
        name: 'Set',
        x: 0,
        y: 0,
        width: 50,
        height: 20,
        componentIds: [compA],
        variantPropertyKey: 'v',
        variantOptions: ['A'],
        baseComponentId: compA,
      },
    });
    const instId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: {
        type: 'INSTANCE',
        name: 'Inst',
        x: 0,
        y: 0,
        width: 50,
        height: 20,
        mainComponentId: setId,
        visible: true,
      },
    });
    applyEngineOp(env, { op: 'deleteNode', nodeId: setId });
    expect(findEnvelopeNode(env, instId)).toBeNull();
    expect(findEnvelopeNode(env, setId)).toBeNull();
  });

  it('can create SLICE, SECTION, and TRANSFORM_GROUP via engine', () => {
    const env = emptyEnvelope();
    const pid = pageId(env);
    const sliceId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'SLICE', name: 'S', x: 0, y: 0, width: 10, height: 10 },
    });
    const sectionId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'SECTION', name: 'Sec', x: 0, y: 0, width: 200, height: 200, children: [] },
    });
    const tgId = applyCreateNodeOp(env, {
      op: 'createNode',
      parentId: pid,
      node: { type: 'TRANSFORM_GROUP', name: 'TG', x: 0, y: 0, width: 80, height: 80, children: [] },
    });
    expect(findEnvelopeNode(env, sliceId)?.type).toBe('SLICE');
    expect(findEnvelopeNode(env, sectionId)?.type).toBe('SECTION');
    expect(findEnvelopeNode(env, tgId)?.type).toBe('TRANSFORM_GROUP');
  });
});
