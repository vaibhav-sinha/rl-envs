import type { StyledSegment } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

/** UTF-16 code unit length (same as `String.prototype.length` in JavaScript). */
export function utf16Len(s: string): number {
  return s.length;
}

/**
 * Validates styled segment ranges: integer bounds, within [0, len), non-empty ranges,
 * pairwise non-overlapping (touching at boundary is allowed).
 */
export function validateStyledSegments(characters: string, segments: StyledSegment[] | undefined): void {
  if (segments === undefined || segments.length === 0) return;
  const len = utf16Len(characters);
  const sorted = [...segments].sort((a, b) => a.start - b.start || a.end - b.end);
  let prevEnd = -1;
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]!;
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end)) {
      throw new ValidationErr('VALIDATION_ERROR', 'styledSegments: start/end must be integers');
    }
    if (s.start < 0 || s.end > len || s.start >= s.end) {
      throw new ValidationErr(
        'VALIDATION_ERROR',
        `styledSegments: range [${String(s.start)},${String(s.end)}) invalid for length ${String(len)}`
      );
    }
    if (s.start < prevEnd) {
      throw new ValidationErr('VALIDATION_ERROR', 'styledSegments: overlapping ranges');
    }
    prevEnd = s.end;
  }
}
