import type { EvalVisualSpec } from '../types.js';

export function buildVisualPrompt(spec: EvalVisualSpec): string {
  const base = spec.instruction;

  switch (spec.mode) {
    case 'relative_to_siblings':
      return `${base}\n\nCompare the focus element in the AFTER image to neighboring elements in the same region. Score how well it matches spacing, typography, color, and visual pattern.`;
    case 'region_stable':
      return `${base}\n\nCompare BEFORE and AFTER images of the same region. The layout should remain coherent; score stability and quality of the update.`;
    case 'match_asset':
      return `${base}\n\nCompare the GENERATED image to the REFERENCE image. Score fidelity, completeness, and polish.`;
    default:
      return base;
  }
}
