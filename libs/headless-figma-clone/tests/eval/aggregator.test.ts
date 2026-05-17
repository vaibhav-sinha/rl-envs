import { describe, expect, it } from 'vitest';
import { aggregateScores, computeCompletionGate } from '../../src/eval/aggregator.js';
import type { EvalSpec, SubCheckResult } from '../../src/eval/types.js';

describe('ScoreAggregator', () => {
  it('produces score in 0-10 range', () => {
    const spec: EvalSpec = { schema_version: 1 };
    const subchecks: SubCheckResult[] = [
      { id: 'check.a', category: 'checks', score: 1, applicable: true, weight: 1 },
    ];
    const report = aggregateScores(spec, subchecks, 1);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(10);
  });

  it('reduces completion_gate when required check fails', () => {
    const spec: EvalSpec = {
      schema_version: 1,
      checks: [{ id: 'a', type: 'node_exists', node_id: 'I99', required: true }],
    };
    const gate = computeCompletionGate([], [{ id: 'check.a', category: 'checks', score: 0, applicable: true, weight: 1 }], spec);
    expect(gate).toBeLessThan(1);
  });
});
