/** Stack trace when available (for console logging). */
export function exportErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack?.trim()) return error.stack;
  return undefined;
}

/**
 * Log export failure to the console with full stack, return a user-visible message.
 * Pass the original `Error` when possible so DevTools prints the stack automatically.
 */
export function logExportError(
  context: string,
  error: unknown,
  level: 'error' | 'warn' = 'error'
): string {
  const log = level === 'warn' ? console.warn : console.error;
  const label = `[export:${context}]`;
  if (error instanceof Error) {
    log(label, error);
  } else {
    log(label, formatExportError(error), error);
  }
  return formatExportError(error);
}

/** Normalize thrown values to a user-visible export error string (never empty). */
export function formatExportError(error: unknown, fallback = 'Export failed'): string {
  if (error instanceof Error) {
    const msg = error.message.trim();
    if (msg) return msg;
    if (error.name && error.name !== 'Error' && error.name !== 'undefined') {
      return `${error.name} (no message)`;
    }
  }
  if (typeof error === 'string') {
    const msg = error.trim();
    if (msg) return msg;
  }
  if (error !== undefined && error !== null && !(error instanceof Error)) {
    const msg = String(error).trim();
    if (msg && msg !== '[object Object]') return msg;
  }
  return fallback;
}
