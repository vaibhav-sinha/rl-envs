/** FIFO queue: parallel MCP tool calls run one at a time (no supersede). */

let tail: Promise<unknown> = Promise.resolve();
let queueDepth = 0;

export function readMcpQueueDepth(): number {
  return queueDepth;
}

export function enqueueMcpWork<T>(fn: () => Promise<T>): Promise<T> {
  queueDepth += 1;
  const run = tail.then(() => fn());
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run.finally(() => {
    queueDepth -= 1;
  });
}

/** @internal Reset queue between tests. */
export function resetMcpToolQueueForTests(): void {
  tail = Promise.resolve();
  queueDepth = 0;
}
