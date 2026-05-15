import type { NewNodeSpec } from '../engine/DocumentEngine.js';
import { ValidationErr } from '../util/errors.js';

const MAX_SVG_CHARS = 64_000;

/** Bounded SVG import: single root `<svg>` with one `<rect>` or `<path>`. */
export function createNodeSpecFromSvg(svg: string): NewNodeSpec {
  if (typeof svg !== 'string' || svg.length === 0 || svg.length > MAX_SVG_CHARS) {
    throw new ValidationErr('VALIDATION_ERROR', 'SVG must be a non-empty string under 64KB');
  }
  const trimmed = svg.trim();
  if (!trimmed.toLowerCase().includes('<svg')) {
    throw new ValidationErr('VALIDATION_ERROR', 'SVG must contain an <svg> root');
  }
  const wMatch = /width\s*=\s*["']([0-9.]+)/i.exec(trimmed);
  const hMatch = /height\s*=\s*["']([0-9.]+)/i.exec(trimmed);
  const width = wMatch ? Number.parseFloat(wMatch[1]!) : 100;
  const height = hMatch ? Number.parseFloat(hMatch[1]!) : 100;
  const pathMatch = /<path[^>]*\sd\s*=\s*["']([^"']+)["']/i.exec(trimmed);
  if (pathMatch?.[1]) {
    return {
      type: 'VECTOR',
      name: 'SVG',
      x: 0,
      y: 0,
      width: Number.isFinite(width) ? width : 100,
      height: Number.isFinite(height) ? height : 100,
      vectorPaths: [{ windingRule: 'NONZERO', data: pathMatch[1] }],
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }],
    };
  }
  const rectMatch = /<rect[^>]*>/i.exec(trimmed);
  if (rectMatch) {
    return {
      type: 'RECTANGLE',
      name: 'SVG Rect',
      x: 0,
      y: 0,
      width: Number.isFinite(width) ? width : 100,
      height: Number.isFinite(height) ? height : 100,
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }],
    };
  }
  throw new ValidationErr('VALIDATION_ERROR', 'SVG import supports a single <path> or <rect> only');
}
