import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { FileEnvelope, FrameNode, RectangleNode } from '../../src/model/types.js';

function frame(id: string, extra: Partial<FrameNode> = {}): FrameNode {
  return {
    id,
    type: 'FRAME',
    name: id,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    children: [],
    strokes: [
      {
        type: 'SOLID',
        color: { r: 0.88, g: 0.88, b: 0.88 },
        visible: true,
        opacity: 1,
        blendMode: 'NORMAL',
      },
    ],
    ...extra,
  };
}

describe('per-side stroke borders', () => {
  it('renders top-only border from individualStrokeWeights', () => {
    const root = frame('F1', {
      individualStrokeWeights: { top: 1, right: 0, bottom: 0, left: 0 },
    });
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileName: 'test',
      nextInternalId: 2,
      document: {
        id: 'D1',
        type: 'DOCUMENT',
        name: 'Doc',
        sourceFigmaId: '0:0',
        children: [
          {
            id: 'P1',
            type: 'PAGE',
            name: 'Page',
            sourceFigmaId: '0:1',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            children: [root],
          },
        ],
      },
    };

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'F1',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.html}\n${out.css}`;
    expect(blob).toContain('border-top:1px solid rgba(224,224,224,1)');
    expect(blob).not.toContain('border-right:');
    expect(blob).not.toContain('border-bottom:');
    expect(blob).not.toContain('border-left:');
  });

  it('applies instance shell stroke override to component root', () => {
    const masterRoot = frame('M1', { strokes: [] });
    const inst = {
      id: 'I1',
      type: 'INSTANCE' as const,
      name: 'Filters',
      sourceFigmaId: '1:2',
      x: 0,
      y: 0,
      width: 120,
      height: 676,
      children: [],
      mainComponentId: 'C1',
      strokes: [],
      overrides: {
        I1: {
          strokes: [
            {
              type: 'SOLID' as const,
              color: { r: 0.88, g: 0.88, b: 0.88 },
              visible: true,
              opacity: 1,
              blendMode: 'NORMAL' as const,
            },
          ],
          individualStrokeWeights: { top: 1, right: 1, bottom: 0, left: 0 },
        },
      },
    };
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileName: 'test',
      nextInternalId: 10,
      document: {
        id: 'D1',
        type: 'DOCUMENT',
        name: 'Doc',
        sourceFigmaId: '0:0',
        children: [
          {
            id: 'P1',
            type: 'PAGE',
            name: 'Page',
            sourceFigmaId: '0:1',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            children: [inst],
          },
        ],
      },
      components: [{ id: 'C1', name: 'Filters', root: masterRoot }],
    };

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I1',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.html}\n${out.css}`;
    expect(blob).toContain('border-top:1px solid rgba(224,224,224,1)');
    expect(blob).toContain('border-right:1px solid rgba(224,224,224,1)');
  });

  it('renders top-only border on rectangles from individualStrokeWeights', () => {
    const rect: RectangleNode = {
      id: 'R1',
      type: 'RECTANGLE',
      name: 'R1',
      x: 0,
      y: 0,
      width: 80,
      height: 40,
      strokes: [
        {
          type: 'SOLID',
          color: { r: 0.88, g: 0.88, b: 0.88 },
          visible: true,
          opacity: 1,
          blendMode: 'NORMAL',
        },
      ],
      individualStrokeWeights: { top: 1, right: 0, bottom: 0, left: 0 },
    };
    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileName: 'test',
      nextInternalId: 2,
      document: {
        id: 'D1',
        type: 'DOCUMENT',
        name: 'Doc',
        sourceFigmaId: '0:0',
        children: [
          {
            id: 'P1',
            type: 'PAGE',
            name: 'Page',
            sourceFigmaId: '0:1',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            children: [rect],
          },
        ],
      },
    };

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'R1',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.html}\n${out.css}`;
    expect(blob).toContain('border-top:1px solid rgba(224,224,224,1)');
    expect(blob).not.toContain('border-right:');
    expect(blob).not.toContain('border-bottom:');
    expect(blob).not.toContain('border-left:');
  });
});
