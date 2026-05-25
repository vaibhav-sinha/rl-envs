export interface McpToolTiming {
  durationMs: number;
  queueWaitMs: number;
}

export type McpToolCallResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
};

/** Telemetry option: embed timing in JSON tool payloads unless prebuilt bundle mode is on. */
export function readIncludeMcpToolTiming(): boolean {
  const raw = process.env.FIGMA_DESIGN_HFC_PREBUILT;
  if (raw === undefined || raw.trim() === '') return true;
  const v = raw.trim().toLowerCase();
  return v !== '1' && v !== 'true';
}

function injectTimingIntoToolText(text: string, timing: McpToolTiming): string {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null || !('ok' in parsed)) {
      return text;
    }
    return JSON.stringify({ ...parsed, timing });
  } catch {
    return text;
  }
}

export function annotateToolResultWithTiming<T extends McpToolCallResult>(
  result: T,
  timing: McpToolTiming
): T {
  if (!readIncludeMcpToolTiming()) return result;

  return {
    ...result,
    content: result.content.map((block) => {
      if (block.type !== 'text' || typeof block.text !== 'string') {
        return block;
      }
      return {
        ...block,
        text: injectTimingIntoToolText(block.text, timing),
      };
    }),
  };
}
