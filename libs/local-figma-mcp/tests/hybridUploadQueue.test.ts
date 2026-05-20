import { describe, expect, it } from 'vitest';
import { HybridUploadQueue } from '../plugin/ui/src/lib/hybrid-upload-queue.js';

describe('HybridUploadQueue', () => {
  it('runs batch jobs strictly in order', async () => {
    const q = new HybridUploadQueue(4);
    const order: number[] = [];
    await q.enqueueBatch(async () => {
      order.push(1);
    });
    await q.enqueueBatch(async () => {
      order.push(2);
    });
    expect(order).toEqual([1, 2]);
  });

  it('allows multiple asset jobs in flight', async () => {
    const q = new HybridUploadQueue(3);
    let inFlight = 0;
    let maxInFlight = 0;

    const assetJob = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight -= 1;
    };

    await Promise.all([
      q.enqueueAsset(assetJob),
      q.enqueueAsset(assetJob),
      q.enqueueAsset(assetJob),
    ]);
    expect(maxInFlight).toBeGreaterThan(1);
  });
});
