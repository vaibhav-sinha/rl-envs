import { describe, expect, it } from 'vitest';
import { mapPool, poolMapStream } from '../plugin/src/tools/asyncPool.js';

describe('asyncPool', () => {
  it('mapPool runs all items with bounded concurrency', async () => {
    const out = await mapPool([1, 2, 3, 4], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8]);
  });

  it('poolMapStream yields each result without collecting all first', async () => {
    const items = [10, 20, 30];
    const collected: number[] = [];
    for await (const v of poolMapStream(items, 2, async (n) => {
      await new Promise((r) => setTimeout(r, 5));
      return n + 1;
    })) {
      collected.push(v);
    }
    expect(collected.sort((a, b) => a - b)).toEqual([11, 21, 31]);
  });
});
