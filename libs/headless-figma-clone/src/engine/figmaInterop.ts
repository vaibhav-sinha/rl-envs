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

const PLUGIN_LAYOUT_GRID_KEYS = new Set([
  'pattern',
  'alignment',
  'gutterSize',
  'count',
  'sectionSize',
  'offset',
  'color',
  'visible',
]);

const ROWS_COLS_ALIGNMENTS = new Set(['MIN', 'MAX', 'STRETCH', 'CENTER']);

/** Figma Plugin API layout grid entry (RowsColsLayoutGrid | GridLayoutGrid). */
export function validatePluginLayoutGridEntry(g: unknown, label: string): void {
  if (!isRecord(g)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label} must be object`);
  }

  const unrecognized = Object.keys(g).filter((k) => !PLUGIN_LAYOUT_GRID_KEYS.has(k));
  if (unrecognized.length > 0) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `Unrecognized key(s) in object: '${unrecognized.join("', '")}' at ${label}`
    );
  }

  const pattern = g.pattern;
  if (pattern === 'GRID') {
    if (typeof g.sectionSize !== 'number' || !Number.isFinite(g.sectionSize) || g.sectionSize <= 0) {
      throw new ValidationErr('VALIDATION_ERROR', `Required value missing at ${label}.sectionSize`);
    }
    if ('gutterSize' in g) {
      throw new ValidationErr('VALIDATION_ERROR', `Unrecognized key(s) in object: 'gutterSize' at ${label}`);
    }
    if ('alignment' in g || 'count' in g || 'offset' in g) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: GRID pattern does not use alignment/count/offset`);
    }
    return;
  }

  if (pattern !== 'ROWS' && pattern !== 'COLUMNS') {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `Invalid literal value, expected "GRID" at ${label}.pattern (got ${String(pattern)})`
    );
  }

  const alignment = g.alignment;
  if (typeof alignment !== 'string' || !ROWS_COLS_ALIGNMENTS.has(alignment)) {
    throw new ValidationErr('VALIDATION_ERROR', `Required value missing at ${label}.alignment`);
  }

  if (typeof g.gutterSize !== 'number' || !Number.isFinite(g.gutterSize) || g.gutterSize < 0) {
    throw new ValidationErr('VALIDATION_ERROR', `Required value missing at ${label}.gutterSize`);
  }

  const count = g.count;
  const countOk =
    count === null ||
    (typeof count === 'number' && Number.isFinite(count) && count >= 1 && Number.isInteger(count));
  if (!countOk) {
    throw new ValidationErr('VALIDATION_ERROR', `Required value missing at ${label}.count`);
  }

  if (alignment === 'STRETCH') {
    if ('sectionSize' in g && g.sectionSize !== undefined) {
      throw new ValidationErr('VALIDATION_ERROR', `Unrecognized key(s) in object: 'sectionSize' at ${label}`);
    }
    if ('offset' in g && g.offset !== undefined) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.offset is not used when alignment is STRETCH`);
    }
    return;
  }

  if (alignment === 'CENTER') {
    if ('offset' in g && g.offset !== undefined) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.offset is not used when alignment is CENTER`);
    }
    return;
  }

  // MIN / MAX
  if (typeof g.sectionSize !== 'number' || !Number.isFinite(g.sectionSize) || g.sectionSize <= 0) {
    throw new ValidationErr('VALIDATION_ERROR', `Required value missing at ${label}.sectionSize`);
  }
  if (typeof g.offset !== 'number' || !Number.isFinite(g.offset) || g.offset < 0) {
    throw new ValidationErr('VALIDATION_ERROR', `Required value missing at ${label}.offset`);
  }
}

export function validatePluginLayoutGrids(grids: unknown, label = 'layoutGrids'): void {
  if (grids === undefined || grids === null) return;
  if (!Array.isArray(grids)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label} must be array`);
  }
  grids.forEach((g, i) => validatePluginLayoutGridEntry(g, `${label}[${String(i)}]`));
}

const CONSTRAINT_H = new Set<LayoutConstraintHorizontal>(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);
const CONSTRAINT_V = new Set<LayoutConstraintVertical>(['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE']);

/** Normalize plugin-axis constraint values only (REST aliases like LEFT_RIGHT / TOP_BOTTOM are rejected). */
export function normalizeConstraintAxis(
  axis: 'horizontal' | 'vertical',
  value: unknown
): LayoutConstraintHorizontal | LayoutConstraintVertical {
  if (typeof value !== 'string') {
    throw new ValidationErr('VALIDATION_ERROR', `constraints.${axis} invalid`);
  }
  const allowed = axis === 'horizontal' ? CONSTRAINT_H : CONSTRAINT_V;
  if (!allowed.has(value as LayoutConstraintHorizontal & LayoutConstraintVertical)) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      axis === 'vertical'
        ? `constraints.vertical invalid — expected MIN | CENTER | MAX | STRETCH | SCALE`
        : `constraints.horizontal invalid — expected MIN | CENTER | MAX | STRETCH | SCALE`
    );
  }
  return value as LayoutConstraintHorizontal & LayoutConstraintVertical;
}

export function normalizeLayoutConstraints(v: unknown, label: string): LayoutConstraints | undefined {
  if (v === undefined || v === null) return undefined;
  if (!isRecord(v)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be object`);
  return {
    horizontal: normalizeConstraintAxis('horizontal', v.horizontal) as LayoutConstraintHorizontal,
    vertical: normalizeConstraintAxis('vertical', v.vertical) as LayoutConstraintVertical,
  };
}

function isInternalLayoutGrid(g: Record<string, unknown>): boolean {
  return g.type === 'COLUMNS' && typeof g.count === 'number' && typeof g.gutter === 'number';
}

/** Convert validated Figma plugin `layoutGrids` entries to internal `{ type, count, gutter }`. */
export function normalizeLayoutGridEntry(g: unknown, frameWidth: number, label: string): LayoutGridColumns {
  if (!isRecord(g)) throw new ValidationErr('VALIDATION_ERROR', `${label} invalid`);

  if (isInternalLayoutGrid(g)) {
    const count = g.count as number;
    const gutter = g.gutter as number;
    if (!Number.isInteger(count) || count < 1) {
      throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.count must be integer >= 1');
    }
    if (!Number.isFinite(gutter) || gutter < 0) {
      throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.gutter must be finite >= 0');
    }
    return {
      type: 'COLUMNS',
      count,
      gutter,
      color: g.color as LayoutGridColumns['color'],
    };
  }

  const pattern = g.pattern ?? g.type;
  if (pattern === 'GRID') {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids: GRID pattern compile not supported');
  }
  if (pattern !== 'COLUMNS' && pattern !== 'ROWS') {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids: only COLUMNS supported');
  }

  const gutter = typeof g.gutterSize === 'number' ? g.gutterSize : 0;
  if (!Number.isFinite(gutter) || gutter < 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.gutterSize must be finite >= 0');
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

  if (g.count === null) {
    const sectionSize = g.sectionSize;
    if (typeof sectionSize !== 'number' || !Number.isFinite(sectionSize) || sectionSize <= 0) {
      throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.sectionSize must be finite number > 0');
    }
    const w = Math.max(1, frameWidth);
    const count = Math.max(1, Math.floor((w + gutter) / (sectionSize + gutter)));
    return {
      type: 'COLUMNS',
      count,
      gutter,
      color: g.color as LayoutGridColumns['color'],
    };
  }

  throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.count must be integer >= 1 or null');
}

export function normalizeLayoutGrids(
  grids: unknown,
  frameWidth: number,
  label = 'layoutGrids'
): LayoutGridColumns[] | undefined {
  if (grids === undefined) return undefined;
  if (!Array.isArray(grids)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be array`);
  const usesPluginShape = grids.some((g) => isRecord(g) && 'pattern' in g);
  if (usesPluginShape) validatePluginLayoutGrids(grids, label);
  return grids.map((g, i) => normalizeLayoutGridEntry(g, frameWidth, `${label}[${String(i)}]`));
}
