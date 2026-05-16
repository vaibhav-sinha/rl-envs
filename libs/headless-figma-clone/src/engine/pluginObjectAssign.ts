import { ValidationErr } from '../util/errors.js';

/** Figma merges some plugin object props in-place; frozen defaults throw "object is not extensible". */
export function assertFigmaObjectAssignable(current: unknown, incoming: unknown): void {
  if (current === undefined || current === null) return;
  if (typeof current !== 'object' || Object.isExtensible(current)) return;
  try {
    Object.assign(current as object, incoming as object);
  } catch {
    throw new ValidationErr('VALIDATION_ERROR', 'object is not extensible');
  }
  throw new ValidationErr('VALIDATION_ERROR', 'object is not extensible');
}
