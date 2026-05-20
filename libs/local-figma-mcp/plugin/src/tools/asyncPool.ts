/** Run async work over `items` with at most `concurrency` in flight. */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

/** Run async work with bounded concurrency, yielding each result as it completes. */
export async function* poolMapStream<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): AsyncGenerator<R> {
  if (items.length === 0) return;

  const limit = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;
  let pending = 0;
  const queue: R[] = [];
  let resolveNext: (() => void) | null = null;
  let done = false;

  const notify = (): void => {
    resolveNext?.();
    resolveNext = null;
  };

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      pending += 1;
      try {
        const result = await fn(items[i]!, i);
        queue.push(result);
        notify();
      } catch (error) {
        done = true;
        notify();
        throw error;
      } finally {
        pending -= 1;
        if (pending === 0 && nextIndex >= items.length) {
          done = true;
          notify();
        }
      }
    }
  }

  let poolError: unknown = null;
  const workers = Array.from({ length: limit }, () =>
    worker().catch((error) => {
      poolError = error;
      done = true;
      notify();
    })
  );
  void Promise.all(workers);

  while (!poolError && (!done || queue.length > 0)) {
    while (queue.length > 0) {
      yield queue.shift()!;
    }
    if (done) break;
    await new Promise<void>((resolve) => {
      resolveNext = resolve;
    });
  }

  if (poolError) throw poolError;
}
