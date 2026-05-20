import { describe, expect, it } from 'vitest';
import { OrderedUploadQueue } from '../plugin/ui/src/lib/ordered-upload-queue.js';

describe('OrderedUploadQueue', () => {
  it('runs jobs in FIFO order', async () => {
    const q = new OrderedUploadQueue();
    const order: number[] = [];

    const p1 = q.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push(1);
    });
    const p2 = q.enqueue(async () => {
      order.push(2);
    });

    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it('whenIdle resolves after all jobs complete', async () => {
    const q = new OrderedUploadQueue();
    void q.enqueue(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    await q.whenIdle();
  });
});
