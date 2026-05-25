import { describe, expect, it } from 'vitest';
import {
  applyEngineOp,
  duplicateNodeInEnvelope,
  refreshInstanceChildrenFromMain,
} from '../../src/engine/DocumentEngine.js';
import {
  findComponentSetForComponentInEnvelope,
  parseVariantComponentName,
  resolveComponentOrSetInEnvelope,
  resolveInstanceRootFrameInEnvelope,
  resolveInstanceRootFrameOptional,
  resolveNodeInEnvelope,
  resolveSelectedComponentIdInEnvelope,
  resolveVariantComponentIdInSet,
} from '../../src/engine/componentResolve.js';
import type {
  ComponentNode,
  ComponentSetNode,
  FileEnvelope,
  FrameNode,
  InstanceNode,
} from '../../src/model/types.js';
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

  it('resolveInstanceRootFrameOptional returns null when master is missing', () => {
    const env = emptyEnvelope();
    const inst: InstanceNode = {
      id: 'I80',
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      mainComponentId: 'I_missing',
    };
    expect(resolveInstanceRootFrameOptional(env, inst)).toBeNull();
  });

  it('resolveInstanceRootFrameOptional returns frame when master lives in components[]', () => {
    const { env, compId } = envelopeWithSidecarComponent();
    const inst: InstanceNode = {
      id: 'I81',
      type: 'INSTANCE',
      name: 'Inst',
      x: 0,
      y: 0,
      width: 40,
      height: 20,
      mainComponentId: compId,
    };
    const root = resolveInstanceRootFrameOptional(env, inst);
    expect(root?.id).toBe('I51');
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

  it('parseVariantComponentName reads multi-axis Figma variant names', () => {
    const parsed = parseVariantComponentName('Property 1=Selected, Has filter applied?=No');
    expect(parsed.get('Property 1')).toBe('Selected');
    expect(parsed.get('Has filter applied?')).toBe('No');
  });

  it('resolveVariantComponentIdInSet matches all variant axes', () => {
    const env = emptyEnvelope(200);
    const pid = pageId(env);
    const setId = 'I200';
    const defaultNo: ComponentNode = {
      id: 'I201',
      type: 'COMPONENT',
      name: 'Property 1=Default, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I202',
    };
    const selectedNo: ComponentNode = {
      id: 'I203',
      type: 'COMPONENT',
      name: 'Property 1=Selected, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I204',
    };
    const defaultNoRoot: FrameNode = {
      id: 'I202',
      type: 'FRAME',
      name: 'DefaultNo',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      children: [],
    };
    const selectedNoRoot: FrameNode = {
      id: 'I204',
      type: 'FRAME',
      name: 'SelectedNo',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      children: [{ id: 'I205', type: 'RECTANGLE', name: 'Bar', x: 0, y: 0, width: 4, height: 40 }],
    };
    const set: ComponentSetNode = {
      id: setId,
      type: 'COMPONENT_SET',
      name: 'Filter',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      componentIds: [defaultNo.id, selectedNo.id],
      variantPropertyKey: 'Property 1',
      variantOptions: ['Selected', 'Default'],
      baseComponentId: defaultNo.id,
      componentPropertyDefinitions: {
        'Property 1': {
          type: 'VARIANT',
          defaultValue: 'Default',
          variantOptions: ['Selected', 'Default'],
        },
        'Has filter applied?': {
          type: 'VARIANT',
          defaultValue: 'No',
          variantOptions: ['No', 'Yes'],
        },
      },
    };
    env.document.children[0]!.children.push(
      set,
      defaultNo,
      selectedNo,
      defaultNoRoot,
      selectedNoRoot
    );

    expect(
      resolveVariantComponentIdInSet(env, set, {
        'Property 1': { type: 'VARIANT', value: 'Selected' },
        'Has filter applied?': { type: 'VARIANT', value: 'No' },
      })
    ).toBe(selectedNo.id);

    expect(
      resolveVariantComponentIdInSet(env, set, {
        'Property 1': { type: 'VARIANT', value: 'Default' },
        'Has filter applied?': { type: 'VARIANT', value: 'No' },
      })
    ).toBe(defaultNo.id);
  });

  it('resolveSelectedComponentIdInEnvelope resolves via parent set when main is a variant COMPONENT', () => {
    const env = emptyEnvelope(300);
    const defaultNo: ComponentNode = {
      id: 'I301',
      type: 'COMPONENT',
      name: 'Property 1=Default, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I302',
    };
    const selectedNo: ComponentNode = {
      id: 'I303',
      type: 'COMPONENT',
      name: 'Property 1=Selected, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I304',
    };
    const set: ComponentSetNode = {
      id: 'I300',
      type: 'COMPONENT_SET',
      name: 'Filter',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      componentIds: [defaultNo.id, selectedNo.id],
      variantPropertyKey: 'Property 1',
      variantOptions: ['Selected', 'Default'],
      componentPropertyDefinitions: {
        'Property 1': {
          type: 'VARIANT',
          defaultValue: 'Default',
          variantOptions: ['Selected', 'Default'],
        },
        'Has filter applied?': {
          type: 'VARIANT',
          defaultValue: 'No',
          variantOptions: ['No', 'Yes'],
        },
      },
    };
    env.document.children[0]!.children.push(
      set,
      defaultNo,
      selectedNo,
      {
        id: 'I302',
        type: 'FRAME',
        name: 'DefaultNo',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        children: [],
      },
      {
        id: 'I304',
        type: 'FRAME',
        name: 'SelectedNo',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        children: [],
      }
    );

    const inst: InstanceNode = {
      id: 'I310',
      type: 'INSTANCE',
      name: 'FilterItem',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      mainComponentId: selectedNo.id,
      componentProperties: {
        'Property 1': { type: 'VARIANT', value: 'Default' },
        'Has filter applied?': { type: 'VARIANT', value: 'No' },
      },
    };

    expect(resolveSelectedComponentIdInEnvelope(env, inst)).toBe(defaultNo.id);
    expect(findComponentSetForComponentInEnvelope(env, selectedNo.id)?.id).toBe(set.id);
  });

  it('setProperties on variant-component main rematerializes children and updates mainComponentId', () => {
    const env = emptyEnvelope(400);
    const instId = 'I410';
    const defaultNo: ComponentNode = {
      id: 'I401',
      type: 'COMPONENT',
      name: 'Property 1=Default, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I402',
    };
    const selectedNo: ComponentNode = {
      id: 'I403',
      type: 'COMPONENT',
      name: 'Property 1=Selected, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I404',
    };
    const set: ComponentSetNode = {
      id: 'I400',
      type: 'COMPONENT_SET',
      name: 'Filter',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      componentIds: [defaultNo.id, selectedNo.id],
      variantPropertyKey: 'Property 1',
      variantOptions: ['Selected', 'Default'],
      componentPropertyDefinitions: {
        'Property 1': {
          type: 'VARIANT',
          defaultValue: 'Default',
          variantOptions: ['Selected', 'Default'],
        },
        'Has filter applied?': {
          type: 'VARIANT',
          defaultValue: 'No',
          variantOptions: ['No', 'Yes'],
        },
      },
    };
    env.document.children[0]!.children.push(
      set,
      defaultNo,
      selectedNo,
      {
        id: 'I402',
        type: 'FRAME',
        name: 'DefaultNo',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        children: [],
      },
      {
        id: 'I404',
        type: 'FRAME',
        name: 'SelectedNo',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        children: [{ id: 'I405', type: 'RECTANGLE', name: 'Bar', x: 0, y: 0, width: 4, height: 40 }],
      }
    );
    env.document.children[0]!.children.push({
      id: instId,
      type: 'INSTANCE',
      name: 'FilterItem',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      mainComponentId: selectedNo.id,
      componentProperties: {
        'Property 1': { type: 'VARIANT', value: 'Selected' },
        'Has filter applied?': { type: 'VARIANT', value: 'No' },
      },
      children: [
        {
          id: 'I406',
          type: 'FRAME',
          name: 'SelectedNo',
          x: 0,
          y: 0,
          width: 120,
          height: 40,
          children: [{ id: 'I407', type: 'RECTANGLE', name: 'Bar', x: 0, y: 0, width: 4, height: 40 }],
        },
      ],
    });

    applyEngineOp(env, {
      op: 'updateNode',
      nodeId: instId,
      patch: {
        componentProperties: {
          'Property 1': { type: 'VARIANT', value: 'Default' },
          'Has filter applied?': { type: 'VARIANT', value: 'No' },
        },
      },
    });

    const inst = resolveNodeInEnvelope(env, instId) as InstanceNode;
    expect(inst.mainComponentId).toBe(defaultNo.id);
    const childFrame = inst.children?.[0];
    expect(childFrame?.type === 'FRAME' ? childFrame.children.some((c) => c.name === 'Bar') : false).toBe(
      false
    );
  });

  it('keeps mainComponentId when instance has no componentProperties (OkerIcons pattern)', () => {
    const env = emptyEnvelope(500);
    const sort: ComponentNode = {
      id: 'I501',
      type: 'COMPONENT',
      name: 'Icon=Sort, Default=Default',
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      rootFrameId: 'I502',
    };
    const home: ComponentNode = {
      id: 'I503',
      type: 'COMPONENT',
      name: 'Icon=Home, Default=house-light',
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      rootFrameId: 'I504',
    };
    const set: ComponentSetNode = {
      id: 'I500',
      type: 'COMPONENT_SET',
      name: 'OkerIcons',
      x: 0,
      y: 0,
      width: 24,
      height: 48,
      componentIds: [sort.id, home.id],
      variantOptions: [sort.name, home.name],
    };
    env.document.children[0]!.children.push(
      set,
      sort,
      home,
      {
        id: 'I502',
        type: 'FRAME',
        name: 'SortRoot',
        x: 0,
        y: 0,
        width: 24,
        height: 24,
        children: [],
      },
      {
        id: 'I504',
        type: 'FRAME',
        name: 'HomeRoot',
        x: 0,
        y: 0,
        width: 24,
        height: 24,
        children: [],
      }
    );
    const inst: InstanceNode = {
      id: 'I510',
      type: 'INSTANCE',
      name: 'OkerIcons',
      x: 0,
      y: 0,
      width: 24,
      height: 24,
      mainComponentId: home.id,
    };
    expect(resolveSelectedComponentIdInEnvelope(env, inst)).toBe(home.id);
  });
});
