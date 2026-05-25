import { describe, expect, it } from 'vitest';
import {
  getFontMetrics,
  isFontAvailable,
  listLocalFontFaces,
  getFontFaceCss,
} from '../../src/fonts/localFontRegistry.js';

describe('localFontRegistry', () => {
  it('loads bundled manifests with all upright weights', () => {
    const faces = listLocalFontFaces();
    expect(faces.length).toBe(18);
    expect(faces.some((f) => f.family === 'Inter' && f.style === 'Regular')).toBe(true);
    expect(faces.some((f) => f.family === 'Barlow' && f.style === 'Semi Bold')).toBe(true);
    expect(isFontAvailable({ family: 'Inter', style: 'Semi Bold' })).toBe(true);
    expect(isFontAvailable({ family: 'Barlow', style: 'Bold' })).toBe(true);
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
    const css = getFontFaceCss('http://127.0.0.1:3847/fonts/', [
      { family: 'Inter', style: 'Regular' },
      { family: 'Barlow', style: 'Bold' },
    ]);
    expect(css).toContain('@font-face');
    expect(css).toContain('inter/Inter-Regular.woff2');
    expect(css).toContain('barlow/Barlow-Bold.woff2');
    expect(css).toContain('format("woff2")');
  });
});
