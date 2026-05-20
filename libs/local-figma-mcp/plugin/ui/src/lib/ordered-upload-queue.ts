/** Serializes async upload jobs (FIFO) so Task Builder receives parts in order. */
export class OrderedUploadQueue {
  private tail: Promise<void> = Promise.resolve();

  enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.tail.then(job);
    this.tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  whenIdle(): Promise<void> {
    return this.tail;
  }
}
