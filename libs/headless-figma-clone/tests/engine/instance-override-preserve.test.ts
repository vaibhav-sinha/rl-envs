import { describe, expect, it } from 'vitest';
import { applyEngineOp } from '../../src/engine/DocumentEngine.js';
import { resolveNodeInEnvelope } from '../../src/engine/componentResolve.js';
import {
  applyPreservableOverrideFields,
  buildDetachedSubtreeNodeMap,
  extractPreservableOverrideFields,
} from '../../src/render/instanceOverridePreserve.js';
import type { ComponentNode, ComponentSetNode, InstanceNode, TextNode } from '../../src/model/types.js';
import { emptyEnvelope } from '../helpers/envelope.js';

function findTextInInstance(inst: InstanceNode): TextNode | undefined {
  const stack = [...(inst.children ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.type === 'TEXT') return n;
    if (n.type === 'FRAME' || n.type === 'GROUP' || n.type === 'TRANSFORM_GROUP') {
      stack.push(...n.children);
    } else if (n.type === 'INSTANCE' && n.children?.length) {
      stack.push(...n.children);
    }
  }
  return undefined;
}

describe('instanceOverridePreserve', () => {
  it('extractPreservableOverrideFields captures TEXT characters', () => {
    const text: TextNode = {
      id: 'I1',
      type: 'TEXT',
      name: 'Label',
      x: 0,
      y: 0,
      width: 40,
      height: 12,
      characters: 'Category',
      fontSize: 12,
    };
    const fields = extractPreservableOverrideFields(text);
    expect(fields?.characters).toBe('Category');
    expect(fields?.fontSize).toBe(12);
  });

  it('applyPreservableOverrideFields copies TEXT onto cloned shell', () => {
    const source: TextNode = {
      id: 'I1',
      type: 'TEXT',
      name: 'Label',
      x: 0,
      y: 0,
      width: 40,
      height: 12,
      characters: 'Category',
      fontSize: 12,
    };
    const target: TextNode = {
      id: 'I1',
      type: 'TEXT',
      name: 'Label',
      x: 0,
      y: 0,
      width: 40,
      height: 12,
      characters: 'Price',
      fontSize: 12,
    };
    applyPreservableOverrideFields(target, source);
    expect(target.characters).toBe('Category');
  });

  it('preserves TEXT characters across variant swap when detached children exist', () => {
    const env = emptyEnvelope(600);
    const instId = 'I610';
    const defaultNo: ComponentNode = {
      id: 'I601',
      type: 'COMPONENT',
      name: 'Property 1=Default, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I602',
    };
    const selectedNo: ComponentNode = {
      id: 'I603',
      type: 'COMPONENT',
      name: 'Property 1=Selected, Has filter applied?=No',
      x: 0,
      y: 0,
      width: 120,
      height: 40,
      rootFrameId: 'I604',
    };
    const set: ComponentSetNode = {
      id: 'I600',
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
        id: 'I602',
        type: 'FRAME',
        name: 'DefaultNo',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        children: [
          {
            id: 'I605',
            type: 'TEXT',
            name: 'Label',
            x: 8,
            y: 12,
            width: 60,
            height: 16,
            characters: 'Price',
            fontSize: 12,
          },
        ],
      },
      {
        id: 'I604',
        type: 'FRAME',
        name: 'SelectedNo',
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        children: [
          {
            id: 'I606',
            type: 'TEXT',
            name: 'Label',
            x: 8,
            y: 12,
            width: 60,
            height: 16,
            characters: 'Price',
            fontSize: 12,
          },
          { id: 'I607', type: 'RECTANGLE', name: 'Bar', x: 0, y: 0, width: 4, height: 40 },
        ],
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
      mainComponentId: defaultNo.id,
      componentProperties: {
        'Property 1': { type: 'VARIANT', value: 'Default' },
        'Has filter applied?': { type: 'VARIANT', value: 'No' },
      },
      children: [
        {
          id: 'I611',
          type: 'FRAME',
          name: 'DefaultNo',
          x: 0,
          y: 0,
          width: 120,
          height: 40,
          children: [
            {
              id: 'I612',
              type: 'TEXT',
              name: 'Label',
              x: 8,
              y: 12,
              width: 60,
              height: 16,
              characters: 'Category',
              fontSize: 12,
            },
          ],
        },
      ],
    });

    const before = resolveNodeInEnvelope(env, instId) as InstanceNode;
    expect(findTextInInstance(before)?.characters).toBe('Category');
    expect(buildDetachedSubtreeNodeMap(before).has('I612')).toBe(true);

    applyEngineOp(env, {
      op: 'updateNode',
      nodeId: instId,
      patch: {
        componentProperties: {
          'Property 1': { type: 'VARIANT', value: 'Selected' },
          'Has filter applied?': { type: 'VARIANT', value: 'No' },
        },
      },
    });

    const after = resolveNodeInEnvelope(env, instId) as InstanceNode;
    expect(after.mainComponentId).toBe(selectedNo.id);
    const text = findTextInInstance(after);
    expect(text?.characters).toBe('Category');
    const overrideChars = Object.values(after.overrides ?? {})
      .map((o) => o.characters)
      .filter((c): c is string => typeof c === 'string');
    expect(overrideChars).toContain('Category');
  });
});
