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
