import { describe, expect, it } from 'vitest';
import type { FrameNode, TextNode } from '../../src/model/types.js';
import {
  applyAutoLayoutIntrinsicSizingDeep,
  syncHugTextLayoutMetricsDeep,
} from '../../src/render/autoLayoutIntrinsicSizing.js';
import {
  createCompileRenderContext,
  createCompileStack,
  renderHeight,
  renderWidth,
  setPatch,
  withCompileStack,
} from '../../src/render/compileRenderContext.js';

describe('CompileRenderContext', () => {
  it('renderWidth/renderHeight read patches over node fields', () => {
    const frame: FrameNode = {
      id: 'f1',
      name: 'f',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      children: [],
      fills: [],
      strokes: [],
    };
    const ctx = createCompileRenderContext();
    setPatch(ctx, 'f1', { width: 120, height: 80 });
    const stack = createCompileStack(ctx);
    expect(renderWidth(stack, frame)).toBe(120);
    expect(renderHeight(stack, frame)).toBe(80);
  });

  it('intrinsic passes write patches without mutating nodes when stack is active', () => {
    const text: TextNode = {
      id: 't1',
      name: 't',
      type: 'TEXT',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      characters: 'Hello',
      fontSize: 16,
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'HUG',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }],
      strokes: [],
    };
    const parent: FrameNode = {
      id: 'p1',
      name: 'p',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      children: [text],
      fills: [],
      strokes: [],
    };
    const ctx = createCompileRenderContext();
    withCompileStack(createCompileStack(ctx), () => {
      applyAutoLayoutIntrinsicSizingDeep(parent);
      syncHugTextLayoutMetricsDeep(parent);
    });
    expect(text.width).toBe(0);
    expect(text.height).toBe(0);
    expect(ctx.patches.get('t1')?.width).toBeGreaterThan(0);
    expect(ctx.patches.get('t1')?.height).toBeGreaterThan(0);
  });
});
