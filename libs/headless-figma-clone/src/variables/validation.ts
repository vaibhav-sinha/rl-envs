import { ValidationErr } from '../util/errors.js';

/** Figma-style validation for variable mode id parameters. */
export function assertRequiredModeId(
  modeId: unknown,
  methodLabel = 'setValueForMode'
): asserts modeId is string {
  if (modeId === undefined || modeId === null || modeId === '') {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `in ${methodLabel}: Property "modeId" failed validation: Required value missing`
    );
  }
  if (typeof modeId !== 'string') {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `in ${methodLabel}: Property "modeId" failed validation: Expected string`
    );
  }
}
