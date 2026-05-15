import type {
  LayoutConstraintHorizontal,
  LayoutConstraints,
  LayoutConstraintVertical,
  LayoutGridColumns,
} from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const CONSTRAINT_H = new Set<LayoutConstraintHorizontal>(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);
const CONSTRAINT_V = new Set<LayoutConstraintVertical>(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);

/** Map Figma REST / plugin constraint aliases to the internal model. */
export function normalizeConstraintAxis(
  axis: 'horizontal' | 'vertical',
  value: unknown
): LayoutConstraintHorizontal | LayoutConstraintVertical {
  if (typeof value !== 'string') {
    throw new ValidationErr('VALIDATION_ERROR', `constraints.${axis} invalid`);
  }
  const mapped =
    axis === 'horizontal'
      ? (
          {
            LEFT: 'MIN',
            RIGHT: 'MAX',
            LEFT_RIGHT: 'STRETCH',
            TOP: 'MIN',
            BOTTOM: 'MAX',
            TOP_BOTTOM: 'STRETCH',
          } as const
        )[value]
      : (
          {
            TOP: 'MIN',
            BOTTOM: 'MAX',
            TOP_BOTTOM: 'STRETCH',
            LEFT: 'MIN',
            RIGHT: 'MAX',
            LEFT_RIGHT: 'STRETCH',
          } as const
        )[value];
  const normalized = mapped ?? value;
  const allowed = axis === 'horizontal' ? CONSTRAINT_H : CONSTRAINT_V;
  if (!allowed.has(normalized as LayoutConstraintHorizontal & LayoutConstraintVertical)) {
    throw new ValidationErr('VALIDATION_ERROR', `constraints.${axis} invalid`);
  }
  return normalized as LayoutConstraintHorizontal & LayoutConstraintVertical;
}

export function normalizeLayoutConstraints(v: unknown, label: string): LayoutConstraints | undefined {
  if (v === undefined || v === null) return undefined;
  if (!isRecord(v)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be object`);
  return {
    horizontal: normalizeConstraintAxis('horizontal', v.horizontal) as LayoutConstraintHorizontal,
    vertical: normalizeConstraintAxis('vertical', v.vertical) as LayoutConstraintVertical,
  };
}

/** Convert Figma plugin `layoutGrids` entries to internal `{ type, count, gutter }`. */
export function normalizeLayoutGridEntry(g: unknown, frameWidth: number, label: string): LayoutGridColumns {
  if (!isRecord(g)) throw new ValidationErr('VALIDATION_ERROR', `${label} invalid`);

  const pattern = g.pattern ?? g.type;
  if (pattern !== 'COLUMNS') {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids: only COLUMNS supported');
  }

  const gutter =
    typeof g.gutter === 'number'
      ? g.gutter
      : typeof g.gutterSize === 'number'
        ? g.gutterSize
        : 0;
  if (!Number.isFinite(gutter) || gutter < 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.gutter must be finite >= 0');
  }

  if (typeof g.count === 'number' && Number.isFinite(g.count) && g.count >= 1) {
    if (!Number.isInteger(g.count)) {
      throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.count must be integer >= 1');
    }
    return {
      type: 'COLUMNS',
      count: g.count,
      gutter,
      color: g.color as LayoutGridColumns['color'],
    };
  }

  const sectionSize = g.sectionSize;
  const gutterSize = g.gutterSize ?? g.gutter;
  if (typeof sectionSize !== 'number' || !Number.isFinite(sectionSize) || sectionSize <= 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.sectionSize must be finite number > 0');
  }
  if (typeof gutterSize !== 'number' || !Number.isFinite(gutterSize) || gutterSize < 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.gutterSize must be finite >= 0');
  }
  const w = Math.max(1, frameWidth);
  const count = Math.max(1, Math.floor((w + gutterSize) / (sectionSize + gutterSize)));
  return {
    type: 'COLUMNS',
    count,
    gutter: gutterSize,
    color: g.color as LayoutGridColumns['color'],
  };
}

export function normalizeLayoutGrids(
  grids: unknown,
  frameWidth: number,
  label = 'layoutGrids'
): LayoutGridColumns[] | undefined {
  if (grids === undefined) return undefined;
  if (!Array.isArray(grids)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be array`);
  return grids.map((g, i) => normalizeLayoutGridEntry(g, frameWidth, `${label}[${String(i)}]`));
}
