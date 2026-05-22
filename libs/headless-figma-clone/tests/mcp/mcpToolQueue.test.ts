import { describe, expect, it } from 'vitest';
import { enqueueMcpWork, resetMcpToolQueueForTests } from '../../src/mcp/mcpToolQueue.js';

describe('mcpToolQueue', () => {
  it('runs concurrent enqueue calls in FIFO order', async () => {
    resetMcpToolQueueForTests();
    const order: number[] = [];
    const stamps: number[] = [];

    const t1 = enqueueMcpWork(async () => {
      order.push(1);
      await new Promise((r) => setTimeout(r, 30));
      stamps.push(Date.now());
      return 1;
    });
    const t2 = enqueueMcpWork(async () => {
      order.push(2);
      await new Promise((r) => setTimeout(r, 10));
      stamps.push(Date.now());
      return 2;
    });
    const t3 = enqueueMcpWork(async () => {
      order.push(3);
      stamps.push(Date.now());
      return 3;
    });

    const results = await Promise.all([t1, t2, t3]);
    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
    for (let i = 1; i < stamps.length; i++) {
      expect(stamps[i]!).toBeGreaterThanOrEqual(stamps[i - 1]!);
    }
  });
});
