/** Scoring categories for raw score aggregation (gates excluded). */
export const SCORING_CATEGORIES = [
  'commands',
  'checks',
  'design_system',
  'visual',
  'metadata',
  'heuristics',
] as const;

export type ScoringCategory = (typeof SCORING_CATEGORIES)[number];

export const DEFAULT_CATEGORY_IMPORTANCE: Record<ScoringCategory, number> = {
  commands: 0.15,
  checks: 0.35,
  design_system: 0.2,
  visual: 0.35,
  metadata: 0.1,
  heuristics: 0.1,
};

function readPositiveNumbers(obj: unknown): Record<string, number> {
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === 'number' && v > 0) out[k] = v;
  }
  return out;
}

/** Merge defaults with legacy `weights` and `category_importance`; drop `gates`. */
export function resolveCategoryImportance(spec: Record<string, unknown>): Record<string, number> {
  const legacy = readPositiveNumbers(spec.weights);
  const explicit = readPositiveNumbers(spec.category_importance);
  const merged: Record<string, number> = { ...DEFAULT_CATEGORY_IMPORTANCE };
  for (const [k, v] of Object.entries({ ...legacy, ...explicit })) {
    if (k === 'gates') continue;
    merged[k] = v;
  }
  return merged;
}

/** Normalize eval spec for API/UI: always expose `category_importance`, strip legacy `weights`. */
export function normalizeEvalSpec<T extends Record<string, unknown>>(spec: T): T {
  const { weights: _w, category_importance: _c, ...rest } = spec;
  return {
    ...rest,
    category_importance: resolveCategoryImportance(spec),
  } as unknown as T;
}

/** Prepare eval spec for disk: schema field `category_importance` only. */
export function prepareEvalSpecForSave<T extends Record<string, unknown>>(spec: T): T {
  return normalizeEvalSpec(spec);
}
