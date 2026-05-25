import { afterEach, describe, expect, it } from 'vitest';
import { resetMcpToolQueueForTests } from '../../src/mcp/mcpToolQueue.js';
import { runMcpToolWithCancellation } from '../../src/mcp/runMcpToolWithCancellation.js';
import { toolJson } from '../../src/mcp/useFigmaMap.js';

const ENV_KEY = 'FIGMA_DESIGN_HFC_PREBUILT';

describe('runMcpToolWithCancellation timing', () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
    resetMcpToolQueueForTests();
  });

  it('injects timing into JSON tool responses when prebuilt mode is off', async () => {
    delete process.env[ENV_KEY];

    const result = await runMcpToolWithCancellation(async () => ({
      content: [{ type: 'text' as const, text: toolJson({ ready: true }) }],
    }));

    const body = JSON.parse(result.content[0]!.text!) as {
      ok: boolean;
      data: { ready: boolean };
      timing: { durationMs: number; queueWaitMs: number };
    };
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ ready: true });
    expect(body.timing.durationMs).toBeGreaterThanOrEqual(0);
    expect(body.timing.queueWaitMs).toBeGreaterThanOrEqual(0);
  });

  it('omits timing when FIGMA_DESIGN_HFC_PREBUILT=1', async () => {
    process.env[ENV_KEY] = '1';

    const result = await runMcpToolWithCancellation(async () => ({
      content: [{ type: 'text' as const, text: toolJson({ ready: true }) }],
    }));

    const body = JSON.parse(result.content[0]!.text!) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.timing).toBeUndefined();
  });

  it('records queue wait for serialized tool calls', async () => {
    delete process.env[ENV_KEY];

    const first = runMcpToolWithCancellation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { content: [{ type: 'text' as const, text: toolJson({ n: 1 }) }] };
    });
    const second = runMcpToolWithCancellation(async () => ({
      content: [{ type: 'text' as const, text: toolJson({ n: 2 }) }],
    }));

    const [, secondResult] = await Promise.all([first, second]);
    const body = JSON.parse(secondResult.content[0]!.text!) as {
      timing: { durationMs: number; queueWaitMs: number };
    };
    expect(body.timing.queueWaitMs).toBeGreaterThanOrEqual(10);
  });
});
