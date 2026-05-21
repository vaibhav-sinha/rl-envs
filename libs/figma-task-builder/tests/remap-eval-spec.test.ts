import { describe, expect, it } from 'vitest';
import { remapEvalSpecIds, remapNodeId } from '../src/remap-eval-spec.js';
import type { EvalSpec } from '../src/types.js';

const MAP = {
  '0:0': 'I3',
  '0:1': 'I4',
  '1:2': 'I5',
  '4817:799': 'I653',
};

describe('remapEvalSpecIds', () => {
  it('leaves HFC ids unchanged', () => {
    expect(remapNodeId('I653', MAP)).toBe('I653');
  });

  it('maps Figma node ids to HFC ids', () => {
    expect(remapNodeId('1:2', MAP)).toBe('I5');
    expect(remapNodeId('4817:799', MAP)).toBe('I653');
  });

  it('remaps gates, checks, visual, and metadata specs', () => {
    const spec: EvalSpec = {
      schema_version: 1,
      gates: {
        preserve_ids: ['4817:799'],
        allowed_change_inside_ids: ['1:2'],
      },
      checks: [
        {
          id: 't1',
          type: 'must_contain_text',
          contains: 'Terms',
          scope: 'node_id',
          node_id: '1:2',
        },
        {
          id: 'p1',
          type: 'property_on_node',
          node_id: '4817:799',
          property: 'name',
          equals: 'Footer',
        },
      ],
      visual: [
        { id: 'gd1', type: 'good_design' },
        { id: 'df1', type: 'design_fit', node_id: '1:2', evaluation_prompt: 'Check fit.' },
        { id: 'tc1', type: 'task_completeness', node_id: '4817:799' },
      ],
      metadata_checks: [{ id: 'd1', type: 'diff' }],
    };

    const remapped = remapEvalSpecIds(spec, MAP);
    expect(remapped.gates?.preserve_ids).toEqual(['I653']);
    expect(remapped.gates?.allowed_change_inside_ids).toEqual(['I5']);
    expect(remapped.checks?.[0]?.node_id).toBe('I5');
    expect(remapped.checks?.[1]?.node_id).toBe('I653');
    expect(remapped.visual?.[1]?.node_id).toBe('I5');
    expect(remapped.visual?.[2]?.node_id).toBe('I653');
    expect(remapped.metadata_checks?.[0]?.type).toBe('diff');
  });

  it('returns spec unchanged when map is empty', () => {
    const spec: EvalSpec = {
      schema_version: 1,
      metadata_checks: [{ id: 'd1', type: 'diff' }],
    };
    expect(remapEvalSpecIds(spec, {})).toBe(spec);
  });
});
