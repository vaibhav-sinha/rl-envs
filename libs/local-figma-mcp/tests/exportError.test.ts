import { describe, expect, it, vi } from 'vitest';
import { exportErrorStack, formatExportError, logExportError } from '../plugin/src/exportError.js';

describe('formatExportError', () => {
  it('never returns empty for blank Error message', () => {
    expect(formatExportError(new Error())).toBe('Export failed');
    expect(formatExportError(new Error(''))).toBe('Export failed');
  });

  it('preserves non-empty messages', () => {
    expect(formatExportError(new Error('PART_LINE_TOO_LARGE'))).toBe('PART_LINE_TOO_LARGE');
  });
});

describe('logExportError', () => {
  it('logs Error with stack and returns message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('network down');
    expect(logExportError('test/context', err)).toBe('network down');
    expect(spy).toHaveBeenCalledWith('[export:test/context]', err);
    spy.mockRestore();
  });

  it('exportErrorStack returns stack for Error', () => {
    const err = new Error('x');
    expect(exportErrorStack(err)).toContain('Error: x');
  });
});
