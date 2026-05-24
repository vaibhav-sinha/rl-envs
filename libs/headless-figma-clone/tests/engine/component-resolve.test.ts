import { describe, expect, it } from 'vitest';
import {
  applyEngineOp,
  duplicateNodeInEnvelope,
  refreshInstanceChildrenFromMain,
} from '../../src/engine/DocumentEngine.js';
import {
  resolveComponentOrSetInEnvelope,
  resolveInstanceRootFrameInEnvelope,
  resolveNodeInEnvelope,
  resolveSelectedComponentIdInEnvelope,
} from '../../src/engine/componentResolve.js';
import type { FileEnvelope, FrameNode, InstanceNode } from '../../src/model/types.js';
import { emptyEnvelope, pageId } from '../helpers/envelope.js';

function envelopeWithSidecarComponent(): {
  env: FileEnvelope;
  compId: string;
  rootFrameId: string;
} {
  const env = emptyEnvelope(100);
  const compId = 'I50';
  const rootFrameId = 'I51';
  const root: FrameNode = {
    id: rootFrameId,
    type: 'FRAME',
    name: 'Master',
    x: 0,
    y: 0,
    width: 40,
    height: 20,
    children: [
      {
        id: 'I52',
        type: 'RECTANGLE',
        name: 'Box',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      },
    ],
  };
  env.components = [
    {
      id: compId,
      name: 'SidecarButton',
      root,
    },
  ];
  return { env, compId, rootFrameId };
}

describe('componentResolve', () => {
  it('resolveNodeInEnvelope finds COMPONENT stub and root from components[] sidecar', () => {
    const { env, compId, rootFrameId } = envelopeWithSidecarComponent();
    const stub = resolveNodeInEnvelope(env, compId);
    expect(stub?.type).toBe('COMPONENT');
    const root = resolveNodeInEnvelope(env, rootFrameId);
    expect(root?.type).toBe('FRAME');
    expect((root as FrameNode).children[0]?.name).toBe('Box');
  });

  it('resolveComponentOrSetInEnvelope resolves sidecar-only mainComponentId', () => {
    const { env, compId } = envelopeWithSidecarComponent();
    const comp = resolveComponentOrSetInEnvelope(env, compId);
    expect(comp?.type).toBe('COMPONENT');
    expect(comp?.id).toBe(compId);
  });

  it('resolveInstanceRootFrameInEnvelope reads master from components[]', () => {
    const { env, compId } = envelopeWithSidecarComponent();
    const inst: InstanceNode = {
      id: 'I60',
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      mainComponentId: compId,
    };
    const root = resolveInstanceRootFrameInEnvelope(env, inst);
    expect(root.id).toBe('I51');
    expect(root.children[0]?.name).toBe('Box');
  });

  it('setProperties via applyEngineOp does not throw when main lives in components[]', () => {
    const { env, compId } = envelopeWithSidecarComponent();
    const pid = pageId(env);
    const instId = 'I61';
    env.document.children[0]!.children.push({
      id: instId,
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      mainComponentId: compId,
      children: [
        {
          id: 'I62',
          type: 'FRAME',
          name: 'Detached',
          x: 0,
          y: 0,
          width: 40,
          height: 20,
          children: [],
        },
      ],
    });

    expect(() => {
      applyEngineOp(env, {
        op: 'updateNode',
        nodeId: instId,
        patch: {
          componentProperties: {
            variant: { type: 'VARIANT', value: 'Default' },
          },
        },
      });
    }).not.toThrow();

    const inst = resolveNodeInEnvelope(env, instId) as InstanceNode;
    expect(inst.children?.length).toBeGreaterThan(0);
  });

  it('resolveSelectedComponentIdInEnvelope works for sidecar COMPONENT', () => {
    const { env, compId } = envelopeWithSidecarComponent();
    const inst: InstanceNode = {
      id: 'I63',
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      mainComponentId: compId,
    };
    expect(resolveSelectedComponentIdInEnvelope(env, inst)).toBe(compId);
  });

  it('duplicateNode hydrates INSTANCE children from sidecar master', () => {
    const { env, compId } = envelopeWithSidecarComponent();
    const pid = pageId(env);
    const instId = 'I64';
    env.document.children[0]!.children.push({
      id: instId,
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      mainComponentId: compId,
    });

    const cloneId = duplicateNodeInEnvelope(env, instId);
    const clone = resolveNodeInEnvelope(env, cloneId) as InstanceNode;
    expect(clone.type).toBe('INSTANCE');
    expect(clone.children?.length).toBeGreaterThan(0);
  });

  it('refreshInstanceChildrenFromMain does not clear children on resolution failure', () => {
    const env = emptyEnvelope();
    const inst: InstanceNode = {
      id: 'I70',
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      mainComponentId: 'I_missing',
      children: [
        {
          id: 'I71',
          type: 'RECTANGLE',
          name: 'Keep',
          x: 0,
          y: 0,
          width: 5,
          height: 5,
        },
      ],
    };
    refreshInstanceChildrenFromMain(env, inst);
    expect(inst.children?.length).toBe(1);
    expect(inst.children?.[0]?.name).toBe('Keep');
  });
});
