/** Single in-flight MCP tool run; superseded runs and timeouts abort the active signal. */

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

/** Abort any previous tool run and return a fresh signal for the new one. */
export function beginInFlightToolRun(): AbortSignal {
  if (active) {
    active.abort(new Error('Superseded by a new MCP tool request'));
  }
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
