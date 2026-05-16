import { describe, expect, it } from 'vitest';
import { measureTextWidthPx } from '../../src/fonts/textMetrics.js';

describe('textMetrics', () => {
  it('measures Hello with Inter Regular metrics', () => {
    const w = measureTextWidthPx('Hello', 16, { family: 'Inter', style: 'Regular' });
    expect(w).toBeGreaterThan(30);
    expect(w).toBeLessThan(60);
  });

  it('uses substitution metrics for missing fonts', () => {
    const inter = measureTextWidthPx('Test', 14, { family: 'Inter', style: 'Regular' });
    const roboto = measureTextWidthPx('Test', 14, { family: 'Roboto', style: 'Regular' });
    expect(roboto).toBe(inter);
  });

  it('bold is wider than regular for the same string', () => {
    const reg = measureTextWidthPx('MMMM', 16, { family: 'Inter', style: 'Regular' });
    const bold = measureTextWidthPx('MMMM', 16, { family: 'Inter', style: 'Bold' });
    expect(bold).toBeGreaterThanOrEqual(reg);
  });
});
