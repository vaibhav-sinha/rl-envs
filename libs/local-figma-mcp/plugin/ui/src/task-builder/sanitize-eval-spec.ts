/** Drop blank string fields so eval-spec JSON Schema validation passes (e.g. optional minLength fields). */
function sanitizeEntries(entries: Record<string, unknown>[]): Record<string, unknown>[] {
  return entries.map((entry) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
      if (key === 'id' || key === 'type') {
        out[key] = value;
        continue;
      }
      if (key === 'criteria' && Array.isArray(value)) {
        const lines = value.map((s) => String(s).trim()).filter(Boolean);
        if (lines.length) out[key] = lines;
        continue;
      }
      if (typeof value === 'string' && !value.trim()) continue;
      out[key] = value;
    }
    return out;
  });
}

export function sanitizeEvalSpecForSave<T extends Record<string, unknown>>(spec: T): T {
  let next = spec;
  if (Array.isArray(spec.visual)) {
    next = { ...next, visual: sanitizeEntries(spec.visual as Record<string, unknown>[]) };
  }
  if (Array.isArray(spec.metadata_checks)) {
    next = {
      ...next,
      metadata_checks: sanitizeEntries(spec.metadata_checks as Record<string, unknown>[]),
    };
  }
  return next;
}
