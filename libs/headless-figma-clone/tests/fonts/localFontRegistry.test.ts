import { describe, expect, it } from 'vitest';
import {
  getFontMetrics,
  isFontAvailable,
  listLocalFontFaces,
  getFontFaceCss,
} from '../../src/fonts/localFontRegistry.js';

describe('localFontRegistry', () => {
  it('loads Inter manifest with all upright weights', () => {
    const faces = listLocalFontFaces();
    expect(faces.length).toBe(9);
    expect(faces.some((f) => f.family === 'Inter' && f.style === 'Regular')).toBe(true);
    expect(isFontAvailable({ family: 'Inter', style: 'Semi Bold' })).toBe(true);
    expect(isFontAvailable({ family: 'Roboto', style: 'Regular' })).toBe(false);
  });

  it('loads metrics for Inter Regular', () => {
    const m = getFontMetrics({ family: 'Inter', style: 'Regular' });
    expect(m).toBeDefined();
    expect(m!.fontWeight).toBe(400);
    expect(m!.advancesEm['M']).toBeGreaterThan(0);
    expect(m!.autoLineHeightEm).toBeGreaterThan(1);
  });

  it('emits @font-face rules with woff2 URLs', () => {
    const css = getFontFaceCss('http://127.0.0.1:3847/fonts/inter/', [
      { family: 'Inter', style: 'Regular' },
    ]);
    expect(css).toContain('@font-face');
    expect(css).toContain('Inter-Regular.woff2');
    expect(css).toContain('format("woff2")');
  });
});
