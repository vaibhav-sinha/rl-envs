import { describe, expect, it } from 'vitest';
import { createNodeSpecFromSvg } from '../../src/images/svgImport.js';
import { ValidationErr } from '../../src/util/errors.js';

describe('createNodeSpecFromSvg', () => {
  it('parses rect SVG into RECTANGLE spec', () => {
    const spec = createNodeSpecFromSvg(
      '<svg width="80" height="40"><rect width="80" height="40" fill="#000"/></svg>'
    );
    expect(spec.type).toBe('RECTANGLE');
    expect(spec.width).toBe(80);
    expect(spec.height).toBe(40);
  });

  it('parses path SVG into VECTOR spec', () => {
    const spec = createNodeSpecFromSvg(
      '<svg width="100" height="100"><path d="M0 0 L10 10" fill="#333"/></svg>'
    );
    expect(spec.type).toBe('VECTOR');
    if (spec.type === 'VECTOR') {
      expect(spec.vectorPaths?.[0]?.data).toContain('M0 0');
    }
  });

  it('rejects empty, oversized, and unsupported SVG', () => {
    expect(() => createNodeSpecFromSvg('')).toThrow(ValidationErr);
    expect(() => createNodeSpecFromSvg('not svg')).toThrow(/must contain an <svg>/);
    expect(() => createNodeSpecFromSvg('<svg><circle cx="5" cy="5" r="4"/></svg>')).toThrow(
      /single <path> or <rect>/
    );
    const huge = `<svg>${'x'.repeat(65_000)}</svg>`;
    expect(() => createNodeSpecFromSvg(huge)).toThrow(/under 64KB/);
  });
});
