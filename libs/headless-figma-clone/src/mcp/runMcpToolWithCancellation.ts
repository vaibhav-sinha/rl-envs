import {
  abortInFlightToolRun,
  beginInFlightToolRun,
  endInFlightToolRun,
  readMcpToolTimeoutMs,
} from './inFlightAbort.js';

/** Runs an MCP tool body with a fresh abort signal; superseded tools and server timeout abort the prior run. */
export async function runMcpToolWithCancellation<T>(
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const signal = beginInFlightToolRun();
  const timeoutMs = readMcpToolTimeoutMs();
  const timer = setTimeout(() => {
    abortInFlightToolRun(`Tool timed out after ${timeoutMs}ms`);
  }, timeoutMs);
  try {
    return await fn(signal);
  } finally {
    clearTimeout(timer);
    endInFlightToolRun();
  }
}
