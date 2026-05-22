import { describe, expect, it } from 'vitest';
import {
  abortInFlightToolRun,
  beginInFlightToolRun,
  endInFlightToolRun,
  throwIfAborted,
} from '../../src/mcp/inFlightAbort.js';

describe('inFlightAbort', () => {
  it('does not abort the previous signal when a new tool run begins (queue serializes)', () => {
    const s1 = beginInFlightToolRun();
    endInFlightToolRun();
    const s2 = beginInFlightToolRun();
    expect(s1.aborted).toBe(false);
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
