import { describe, expect, it } from 'vitest';
import {
  exposeAxisSizingMode,
  normalizeAxisSizingModeStored,
  validateAxisSizingMode,
} from '../../src/engine/axisSizingMode.js';
import { ValidationErr } from '../../src/util/errors.js';

describe('axisSizingMode', () => {
  it('normalizes legacy HUG to AUTO', () => {
    expect(normalizeAxisSizingModeStored('HUG')).toBe('AUTO');
    expect(normalizeAxisSizingModeStored('AUTO')).toBe('AUTO');
    expect(normalizeAxisSizingModeStored('FIXED')).toBe('FIXED');
  });

  it('validateAxisSizingMode allows only FIXED and AUTO', () => {
    expect(validateAxisSizingMode('AUTO', 'primaryAxisSizingMode')).toBe('AUTO');
    expect(() => validateAxisSizingMode('HUG', 'primaryAxisSizingMode')).toThrow(ValidationErr);
  });

  it('exposeAxisSizingMode maps stored HUG for script reads', () => {
    expect(exposeAxisSizingMode('HUG')).toBe('AUTO');
  });
});
