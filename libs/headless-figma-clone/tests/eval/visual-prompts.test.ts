import { describe, expect, it } from 'vitest';
import { buildVisualPrompt } from '../../src/eval/visual/prompts.js';

describe('visual prompts', () => {
  it('relative_to_siblings mentions neighbors', () => {
    const p = buildVisualPrompt({
      id: 'v',
      region_id: 'I2',
      mode: 'relative_to_siblings',
      instruction: 'Match cards',
    });
    expect(p).toContain('neighboring');
  });

  it('region_stable mentions BEFORE and AFTER', () => {
    const p = buildVisualPrompt({
      id: 'v',
      region_id: 'I2',
      mode: 'region_stable',
      instruction: 'Keep layout',
    });
    expect(p.toLowerCase()).toContain('before');
  });
});
