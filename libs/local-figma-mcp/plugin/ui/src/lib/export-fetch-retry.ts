import { logExportError } from '../../../src/exportError.js';

const DEFAULT_MAX_ATTEMPTS = 5;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 15_000;

const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function isRetryableHttpStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

/** Network / transport failures (e.g. Failed to fetch, ERR_EMPTY_RESPONSE). */
export function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return false;
  if (error instanceof TypeError) return true;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch failed')
  );
}

export function exportRetryBackoffMs(attempt: number): number {
  const exp = INITIAL_BACKOFF_MS * 2 ** Math.max(0, attempt - 1);
  return Math.min(exp, MAX_BACKOFF_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ExportFetchRetryOptions {
  maxAttempts?: number;
}

/**
 * fetch with retries for transient Task Builder export failures.
 * Re-throws non-retryable HTTP responses so callers can parse error bodies.
 */
export async function fetchWithExportRetry(
  url: string,
  init?: RequestInit,
  options: ExportFetchRetryOptions = {}
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (isRetryableHttpStatus(res.status) && attempt < maxAttempts) {
        console.warn(
          `[export:fetch/retry] HTTP ${res.status} ${url} attempt ${attempt}/${maxAttempts}`
        );
        await sleep(exportRetryBackoffMs(attempt));
        continue;
      }
      return res;
    } catch (error) {
      lastError = error;
      if (!isRetryableFetchError(error) || attempt >= maxAttempts) {
        logExportError(`fetch/failed ${url}`, error);
        throw error;
      }
      logExportError(`fetch/retry ${url} attempt ${attempt}/${maxAttempts}`, error, 'warn');
      await sleep(exportRetryBackoffMs(attempt));
    }
  }

  const final =
    lastError instanceof Error ? lastError : new Error('Export request failed after retries');
  logExportError(`fetch/exhausted ${url}`, final);
  throw final;
}
