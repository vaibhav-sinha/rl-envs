import { describe, expect, it } from 'vitest';
import { validateEvalSpec } from '../../src/eval/schema.js';

describe('eval-spec schema', () => {
  it('accepts valid minimal spec', () => {
    const spec = validateEvalSpec({
      schema_version: 1,
      checks: [{ id: 'a', type: 'node_exists', node_id: 'I3' }],
    });
    expect(spec.checks?.[0]?.type).toBe('node_exists');
  });

  it('rejects unknown check type', () => {
    expect(() =>
      validateEvalSpec({
        schema_version: 1,
        checks: [{ id: 'a', type: 'unknown_type', node_id: 'I3' }],
      })
    ).toThrow();
  });

  it('rejects unknown visual mode', () => {
    expect(() =>
      validateEvalSpec({
        schema_version: 1,
        visual: [{ id: 'v', region_id: 'I2', mode: 'bad_mode', instruction: 'x' }],
      })
    ).toThrow();
  });

  it('requires min_instances for component_instances_under', () => {
    expect(() =>
      validateEvalSpec({
        schema_version: 1,
        checks: [
          {
            id: 'a',
            type: 'component_instances_under',
            scope_id: 'I3',
            component_id: 'COMP1',
          },
        ],
      })
    ).toThrow();
  });
});
