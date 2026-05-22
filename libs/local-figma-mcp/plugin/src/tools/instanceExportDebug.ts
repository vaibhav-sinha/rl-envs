/** Collected during export; drained after tree serialize and shown in plugin UI. */
const lines: string[] = [];
const MAX_LINES = 40;

export function pushInstanceExportDebug(line: string): void {
  if (lines.length < MAX_LINES) lines.push(line);
}

export function drainInstanceExportDebug(): string[] {
  const out = [...lines];
  lines.length = 0;
  return out;
}
