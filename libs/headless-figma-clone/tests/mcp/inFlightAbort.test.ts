import { describe, expect, it } from 'vitest';
import {
  abortInFlightToolRun,
  beginInFlightToolRun,
  endInFlightToolRun,
  throwIfAborted,
} from '../../src/mcp/inFlightAbort.js';

describe('inFlightAbort', () => {
  it('aborts the previous signal when a new tool run begins', () => {
    const s1 = beginInFlightToolRun();
    const s2 = beginInFlightToolRun();
    expect(s1.aborted).toBe(true);
    expect(s2.aborted).toBe(false);
    endInFlightToolRun();
  });

  it('throwIfAborted throws when the signal is aborted', () => {
    const s1 = beginInFlightToolRun();
    abortInFlightToolRun('timed out');
    expect(() => throwIfAborted(s1)).toThrow(/timed out/);
    endInFlightToolRun();
  });
});
