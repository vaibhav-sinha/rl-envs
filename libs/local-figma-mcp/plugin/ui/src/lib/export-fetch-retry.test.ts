import { describe, expect, it } from 'vitest';
import {
  exportRetryBackoffMs,
  isRetryableFetchError,
  isRetryableHttpStatus,
} from './export-fetch-retry';

describe('isRetryableHttpStatus', () => {
  it('retries server and rate-limit errors', () => {
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(429)).toBe(true);
  });

  it('does not retry client errors', () => {
    expect(isRetryableHttpStatus(400)).toBe(false);
    expect(isRetryableHttpStatus(404)).toBe(false);
  });
});

describe('isRetryableFetchError', () => {
  it('treats fetch TypeError and common network messages as retryable', () => {
    expect(isRetryableFetchError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableFetchError(new Error('NetworkError when attempting to fetch resource.'))).toBe(
      true
    );
  });

  it('does not retry aborts or application errors', () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    expect(isRetryableFetchError(abort)).toBe(false);
    expect(isRetryableFetchError(new Error('NOT_FOUND: export session'))).toBe(false);
  });
});

describe('exportRetryBackoffMs', () => {
  it('grows exponentially up to the cap', () => {
    expect(exportRetryBackoffMs(1)).toBe(500);
    expect(exportRetryBackoffMs(2)).toBe(1000);
    expect(exportRetryBackoffMs(10)).toBe(15_000);
  });
});
