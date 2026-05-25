import { afterEach, describe, expect, it } from 'vitest';
import {
  annotateToolResultWithTiming,
  readIncludeMcpToolTiming,
} from '../../src/mcp/toolResponseTiming.js';
import { toolErrorJson, toolJson } from '../../src/mcp/useFigmaMap.js';

const ENV_KEY = 'FIGMA_DESIGN_HFC_PREBUILT';

describe('readIncludeMcpToolTiming', () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('enables timing when FIGMA_DESIGN_HFC_PREBUILT is unset', () => {
    delete process.env[ENV_KEY];
    expect(readIncludeMcpToolTiming()).toBe(true);
  });

  it('enables timing for non-prebuilt values', () => {
    process.env[ENV_KEY] = '0';
    expect(readIncludeMcpToolTiming()).toBe(true);
    process.env[ENV_KEY] = 'false';
    expect(readIncludeMcpToolTiming()).toBe(true);
  });

  it('disables timing for prebuilt values', () => {
    process.env[ENV_KEY] = '1';
    expect(readIncludeMcpToolTiming()).toBe(false);
    process.env[ENV_KEY] = 'true';
    expect(readIncludeMcpToolTiming()).toBe(false);
  });
});

describe('annotateToolResultWithTiming', () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  it('adds timing to tool JSON text blocks', () => {
    delete process.env[ENV_KEY];
    const result = annotateToolResultWithTiming(
      {
        content: [{ type: 'text', text: toolJson({ hits: [] }) }],
      },
      { durationMs: 42, queueWaitMs: 7 }
    );

    const body = JSON.parse(result.content[0]!.text!) as {
      ok: boolean;
      data: unknown;
      timing: { durationMs: number; queueWaitMs: number };
    };
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ hits: [] });
    expect(body.timing).toEqual({ durationMs: 42, queueWaitMs: 7 });
  });

  it('adds timing to tool error JSON text blocks', () => {
    delete process.env[ENV_KEY];
    const result = annotateToolResultWithTiming(
      {
        content: [{ type: 'text', text: toolErrorJson('NO_ACTIVE_FILE', 'No active file') }],
        isError: true,
      },
      { durationMs: 12, queueWaitMs: 0 }
    );

    const body = JSON.parse(result.content[0]!.text!) as {
      ok: boolean;
      errorCode: string;
      timing: { durationMs: number; queueWaitMs: number };
    };
    expect(body.ok).toBe(false);
    expect(body.errorCode).toBe('NO_ACTIVE_FILE');
    expect(body.timing).toEqual({ durationMs: 12, queueWaitMs: 0 });
  });

  it('leaves non-tool text and image blocks unchanged', () => {
    delete process.env[ENV_KEY];
    const result = annotateToolResultWithTiming(
      {
        content: [
          { type: 'text', text: '--- notes.txt ---\nhello' },
          { type: 'image', data: 'abc', mimeType: 'image/png' },
        ],
      },
      { durationMs: 5, queueWaitMs: 1 }
    );

    expect(result.content[0]!.text).toBe('--- notes.txt ---\nhello');
    expect(result.content[1]).toMatchObject({ type: 'image', data: 'abc' });
  });

  it('skips annotation when prebuilt mode is enabled', () => {
    process.env[ENV_KEY] = '1';
    const text = toolJson({ pages: [] });
    const result = annotateToolResultWithTiming(
      { content: [{ type: 'text', text }] },
      { durationMs: 99, queueWaitMs: 99 }
    );

    expect(result.content[0]!.text).toBe(text);
  });
});
