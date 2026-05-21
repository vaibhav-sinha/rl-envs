import type { EvalSpec } from '../api/taskBuilder';

export const AUTO_VISUAL_TYPES = ['good_design', 'task_completeness'] as const;

export const DEFAULT_DESIGN_FIT_PROMPT =
  "Evaluate how well the agent's changes fit within the original surrounding design. " +
  'Consider layout integration, scale, style cohesion, and whether new elements feel ' +
  'native to the parent frame.';

export function ensureDefaultVisualChecks(spec: EvalSpec): EvalSpec {
  const visual = [...(spec.visual ?? [])];
  const types = new Set(visual.map((v) => String(v.type)));

  if (!types.has('good_design')) {
    visual.unshift({ id: 'good_design_1', type: 'good_design' });
  }
  if (!types.has('task_completeness')) {
    visual.push({ id: 'task_completeness_1', type: 'task_completeness' });
  }

  return visual.length === (spec.visual ?? []).length ? spec : { ...spec, visual };
}
