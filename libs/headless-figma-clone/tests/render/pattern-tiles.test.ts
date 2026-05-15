import { describe, expect, it } from 'vitest';
import {
  buildPatternTileSvgDataUrl,
  patternRepeatCellSize,
  patternSpacingPx,
} from '../../src/render/patternTiles.js';
import type { EllipseNode, FileEnvelope, PatternPaint } from '../../src/model/types.js';

describe('patternTiles', () => {
  it('treats spacing as multiple of scaled tile size (Figma semantics)', () => {
    expect(patternSpacingPx({ x: 0.5, y: 0.5 }, 16, 16)).toEqual({ x: 8, y: 8 });
    expect(patternSpacingPx({ x: 8, y: 8 }, 16, 16)).toEqual({ x: 128, y: 128 });
  });

  it('builds SVG tile with spacing in the repeat cell', () => {
    const tile: EllipseNode = {
      id: 'I2',
      type: 'ELLIPSE',
      name: 'Tile',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
      visible: true,
      fills: [{ type: 'SOLID', color: { r: 0.25, g: 0.55, b: 0.95 } }],
    };
    const envelope: FileEnvelope = {
      document: {
        id: 'D1',
        name: 'Doc',
        children: [{ id: 'P1', type: 'PAGE', name: 'Page', children: [tile] }],
      },
    };
    const fill: PatternPaint = {
      type: 'PATTERN',
      sourceNodeId: 'I2',
      tileType: 'RECTANGULAR',
      scalingFactor: 1,
      spacing: { x: 0.5, y: 0.5 },
    };
    const { stepX, stepY } = patternRepeatCellSize(fill, 16, 16);
    expect(stepX).toBe(24);
    expect(stepY).toBe(24);
    const url = buildPatternTileSvgDataUrl(envelope, fill);
    expect(url).toMatch(/^data:image\/svg\+xml/);
    expect(url).toContain(encodeURIComponent('width="24"'));
  });
});
