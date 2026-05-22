/** Abort signal for the single MCP tool run currently executing (timeout / client cancel). */

let active: AbortController | null = null;

export function readMcpToolTimeoutMs(): number {
  const raw = process.env.HFC_MCP_TOOL_TIMEOUT_MS;
  if (raw === undefined || raw === '') return 55_000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 55_000;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const reason = signal.reason;
  if (reason instanceof Error) throw reason;
  throw new Error(typeof reason === 'string' ? reason : 'Tool run aborted');
}

/** Fresh signal for the current queued tool run (does not abort a prior run — queue serializes). */
export function beginInFlightToolRun(): AbortSignal {
  active = new AbortController();
  return active.signal;
}

export function abortInFlightToolRun(reason: string): void {
  if (!active) return;
  active.abort(new Error(reason));
}

export function endInFlightToolRun(): void {
  active = null;
}
