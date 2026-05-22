import {
  abortInFlightToolRun,
  beginInFlightToolRun,
  endInFlightToolRun,
  readMcpToolTimeoutMs,
} from './inFlightAbort.js';
import { enqueueMcpWork } from './mcpToolQueue.js';

/** Runs an MCP tool body on the FIFO queue with a fresh abort signal and server timeout. */
export async function runMcpToolWithCancellation<T>(
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  return enqueueMcpWork(async () => {
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
  });
}
