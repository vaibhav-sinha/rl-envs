import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  getMetadataInputSchema,
  getScreenshotInputSchema,
  getVariableDefsInputSchema,
  searchDesignSystemInputSchema,
  useFigmaInputSchema,
  TOOL_DESCRIPTIONS,
} from '../src/mcp/toolDefinitions.js';

describe('toolDefinitions', () => {
  it('exports non-empty descriptions from tools-and-prompts', () => {
    for (const key of Object.keys(TOOL_DESCRIPTIONS) as (keyof typeof TOOL_DESCRIPTIONS)[]) {
      expect(TOOL_DESCRIPTIONS[key].length).toBeGreaterThan(20);
    }
  });

  it('parses get_metadata input', () => {
    const schema = z.object(getMetadataInputSchema);
    const r = schema.safeParse({ fileKey: 'abc123', nodeId: '1:2' });
    expect(r.success).toBe(true);
  });

  it('parses get_screenshot input', () => {
    const schema = z.object(getScreenshotInputSchema);
    const r = schema.safeParse({
      fileKey: 'pqrs',
      nodeId: '1-2',
      maxDimension: 2048,
    });
    expect(r.success).toBe(true);
  });

  it('parses use_figma input', () => {
    const schema = z.object(useFigmaInputSchema);
    const r = schema.safeParse({
      fileKey: 'k',
      code: 'return 1',
      description: 'test',
    });
    expect(r.success).toBe(true);
  });

  it('parses search_design_system input', () => {
    const schema = z.object(searchDesignSystemInputSchema);
    const r = schema.safeParse({ query: 'button', fileKey: 'k' });
    expect(r.success).toBe(true);
  });

  it('requires nodeId for get_variable_defs', () => {
    const schema = z.object(getVariableDefsInputSchema);
    const r = schema.safeParse({ fileKey: 'k' });
    expect(r.success).toBe(false);
  });
});
