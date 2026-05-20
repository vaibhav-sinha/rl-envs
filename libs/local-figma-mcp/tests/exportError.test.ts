import { describe, expect, it } from 'vitest';
import { formatExportError } from '../plugin/src/exportError.js';

describe('formatExportError', () => {
  it('never returns empty for blank Error message', () => {
    expect(formatExportError(new Error())).toBe('Export failed');
    expect(formatExportError(new Error(''))).toBe('Export failed');
  });

  it('preserves non-empty messages', () => {
    expect(formatExportError(new Error('PART_LINE_TOO_LARGE'))).toBe('PART_LINE_TOO_LARGE');
  });
});
