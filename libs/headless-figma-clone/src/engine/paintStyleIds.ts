import type { FileEnvelope } from '../model/types.js';
import { ValidationErr } from '../util/errors.js';

export type PaintStyleIdTarget = {
  fillStyleId?: string;
  strokeStyleId?: string;
  effectStyleId?: string;
};

/** Apply fill/stroke/effect style id fields from an updateNode patch (Figma set*StyleIdAsync parity). */
export function applyPaintStyleIdsFromPatch(
  target: PaintStyleIdTarget,
  patch: Record<string, unknown>,
  env: FileEnvelope
): void {
  if ('fillStyleId' in patch) {
    const fs = patch.fillStyleId;
    if (fs === undefined || fs === null || fs === '') {
      delete target.fillStyleId;
    } else {
      if (typeof fs !== 'string' || !env.paintStyles?.some((s) => s.id === fs)) {
        throw new ValidationErr('VALIDATION_ERROR', 'fillStyleId must reference an existing paint style');
      }
      target.fillStyleId = fs;
    }
  }
  if ('strokeStyleId' in patch) {
    const ss = patch.strokeStyleId;
    if (ss === undefined || ss === null || ss === '') {
      delete target.strokeStyleId;
    } else {
      if (typeof ss !== 'string' || !env.paintStyles?.some((s) => s.id === ss)) {
        throw new ValidationErr('VALIDATION_ERROR', 'strokeStyleId must reference an existing paint style');
      }
      target.strokeStyleId = ss;
    }
  }
  if ('effectStyleId' in patch) {
    const es = patch.effectStyleId;
    if (es === undefined || es === null || es === '') {
      delete target.effectStyleId;
    } else {
      if (typeof es !== 'string' || !env.effectStyles?.some((s) => s.id === es)) {
        throw new ValidationErr('VALIDATION_ERROR', 'effectStyleId must reference an existing effect style');
      }
      target.effectStyleId = es;
    }
  }
}
