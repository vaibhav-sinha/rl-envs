/** Serializes batch uploads; runs asset uploads with bounded concurrency. */
export class HybridUploadQueue {
  private batchTail: Promise<void> = Promise.resolve();
  private assetInFlight = 0;
  private assetWaiters: Array<() => void> = [];

  constructor(private readonly maxAssetConcurrent: number) {}

  enqueueBatch<T>(job: () => Promise<T>): Promise<T> {
    const run = this.batchTail.then(job);
    this.batchTail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async enqueueAsset<T>(job: () => Promise<T>): Promise<T> {
    await this.waitAssetSlot();
    try {
      return await job();
    } finally {
      this.assetInFlight -= 1;
      this.wakeAssetWaiters();
    }
  }

  whenIdle(): Promise<void> {
    return this.batchTail.then(() => this.waitAssetsIdle());
  }

  private waitAssetsIdle(): Promise<void> {
    if (this.assetInFlight === 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const check = (): void => {
        if (this.assetInFlight === 0) resolve();
        else this.assetWaiters.push(check);
      };
      check();
    });
  }

  private async waitAssetSlot(): Promise<void> {
    while (this.assetInFlight >= this.maxAssetConcurrent) {
      await new Promise<void>((resolve) => {
        this.assetWaiters.push(resolve);
      });
    }
    this.assetInFlight += 1;
  }

  private wakeAssetWaiters(): void {
    const waiters = this.assetWaiters;
    this.assetWaiters = [];
    for (const w of waiters) w();
  }
}

export function isAssetUploadBody(body: string): boolean {
  return body.includes('"kind":"asset"') || body.includes('"asset"');
}
