import { describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { EllipseNode, FileEnvelope, RectangleNode } from '../../src/model/types.js';

function envelopeWithRect(rect: RectangleNode): FileEnvelope {
  return {
    document: {
      id: 'D1',
      name: 'Doc',
      children: [
        {
          id: 'P1',
          type: 'PAGE',
          name: 'Page',
          children: [rect],
        },
      ],
    },
  };
}

describe('stacked fills', () => {
  it('renders solid under semi-transparent linear gradient (scenario 19)', () => {
    const rect: RectangleNode = {
      id: 'I2',
      type: 'RECTANGLE',
      name: 'Rect',
      x: 90,
      y: 90,
      width: 300,
      height: 180,
      visible: true,
      fills: [
        { type: 'SOLID', color: { r: 0.2, g: 0.3, b: 0.8 } },
        {
          type: 'GRADIENT_LINEAR',
          gradientStops: [
            { position: 0, color: { r: 1, g: 1, b: 1, a: 0.6 } },
            { position: 1, color: { r: 0, g: 0, b: 0, a: 0.2 } },
          ],
          gradientTransform: [
            [0, 1, 0],
            [1, 0, 0],
          ],
        },
      ],
    };
    const out = designCompiler.compileSubtree({
      envelope: envelopeWithRect(rect),
      rootNodeId: 'I2',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(out.css).toContain('background-color:rgba(51,77,204');
    expect(out.css).toContain('background-image:linear-gradient');
  });

  it('renders pattern fill from ellipse source (scenario 20)', () => {
    const tile: EllipseNode = {
      id: 'I2',
      type: 'ELLIPSE',
      name: 'Tile',
      x: -40,
      y: -40,
      width: 16,
      height: 16,
      visible: true,
      fills: [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.95 } }],
    };
    const rect: RectangleNode = {
      id: 'I3',
      type: 'RECTANGLE',
      name: 'Rect',
      x: 100,
      y: 90,
      width: 280,
      height: 180,
      visible: true,
      fills: [
        {
          type: 'PATTERN',
          sourceNodeId: 'I2',
          tileType: 'RECTANGULAR',
          scalingFactor: 1,
          spacing: { x: 0.5, y: 0.5 },
        },
      ],
    };
    const envelope: FileEnvelope = {
      document: {
        id: 'D1',
        name: 'Doc',
        children: [
          {
            id: 'P1',
            type: 'PAGE',
            name: 'Page',
            children: [tile, rect],
          },
        ],
      },
    };
    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(out.css).toMatch(/background-image:url\(/);
    expect(out.css).toContain('background-repeat:repeat');
    expect(out.css).toContain('background-size:24px 24px');
  });
});
