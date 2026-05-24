/** When `HFC_CLONE_TIMING=1`, log duplicate/clone phase timings to stderr. */
export function cloneTimingEnabled(): boolean {
  return process.env.HFC_CLONE_TIMING === '1';
}

export function logCloneTiming(
  phase: string,
  extra: Record<string, string | number | boolean | undefined>
): void {
  if (!cloneTimingEnabled()) return;
  const payload = { msg: `[hfc] clone_timing:${phase}`, ...extra };
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(payload));
}

export function elapsedMs(start: number): number {
  return Math.round(performance.now() - start);
}
