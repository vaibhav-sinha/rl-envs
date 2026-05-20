/** Drop blank string fields so eval-spec JSON Schema validation passes (e.g. optional minLength fields). */
export function sanitizeEvalSpecForSave<T extends Record<string, unknown>>(spec: T): T {
  if (!Array.isArray(spec.visual)) return spec;
  const visual = (spec.visual as Record<string, unknown>[]).map((entry) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'id' || key === 'type') {
        out[key] = value;
        continue;
      }
      if (typeof value === 'string' && !value.trim()) continue;
      out[key] = value;
    }
    return out;
  });
  return { ...spec, visual };
}
