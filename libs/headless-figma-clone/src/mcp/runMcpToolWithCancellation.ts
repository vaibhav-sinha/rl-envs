import {
  abortInFlightToolRun,
  beginInFlightToolRun,
  endInFlightToolRun,
  readMcpToolTimeoutMs,
} from './inFlightAbort.js';
import { enqueueMcpWork } from './mcpToolQueue.js';
import {
  annotateToolResultWithTiming,
  readIncludeMcpToolTiming,
  type McpToolCallResult,
} from './toolResponseTiming.js';

/** Runs an MCP tool body on the FIFO queue with a fresh abort signal and server timeout. */
export async function runMcpToolWithCancellation<T extends McpToolCallResult>(
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const includeTiming = readIncludeMcpToolTiming();
  const enqueuedAt = includeTiming ? performance.now() : 0;

  return enqueueMcpWork(async () => {
    const queueWaitMs = includeTiming ? Math.round(performance.now() - enqueuedAt) : 0;
    const executionStart = includeTiming ? performance.now() : 0;
    const signal = beginInFlightToolRun();
    const timeoutMs = readMcpToolTimeoutMs();
    const timer = setTimeout(() => {
      abortInFlightToolRun(`Tool timed out after ${timeoutMs}ms`);
    }, timeoutMs);
    try {
      const result = await fn(signal);
      if (!includeTiming) return result;
      const durationMs = Math.round(performance.now() - executionStart);
      return annotateToolResultWithTiming(result, { durationMs, queueWaitMs });
    } finally {
      clearTimeout(timer);
      endInFlightToolRun();
    }
  });
}
