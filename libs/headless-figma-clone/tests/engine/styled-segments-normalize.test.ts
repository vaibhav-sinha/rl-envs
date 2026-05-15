import { describe, expect, it } from 'vitest';
import { parseStyledSegmentsInput } from '../../src/engine/styledSegmentsNormalize.js';

describe('parseStyledSegmentsInput', () => {
  it('accepts nested envelope segments', () => {
    const segs = parseStyledSegmentsInput([
      { start: 0, end: 3, style: { fontSize: 24, fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] } },
    ]);
    expect(segs).toEqual([
      {
        start: 0,
        end: 3,
        style: { fontSize: 24, fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] },
      },
    ]);
  });

  it('accepts Figma-flat segments and normalizes hyperlink value → url', () => {
    const segs = parseStyledSegmentsInput([
      { start: 0, end: 3, fontSize: 24 },
      { start: 4, end: 7, fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.1, b: 0.1 } }] },
      { start: 8, end: 12, hyperlink: { type: 'URL', value: 'https://example.com' } },
    ]);
    expect(segs).toEqual([
      { start: 0, end: 3, style: { fontSize: 24 } },
      {
        start: 4,
        end: 7,
        style: { fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.1, b: 0.1 } }] },
      },
      { start: 8, end: 12, style: { hyperlink: { type: 'URL', url: 'https://example.com' } } },
    ]);
  });
});
