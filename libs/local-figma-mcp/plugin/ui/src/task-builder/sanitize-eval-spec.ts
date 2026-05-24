import { prepareEvalSpecForSave as stripLegacyWeights } from './category-importance.js';

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
  let next = stripLegacyWeights(spec);
  const screenshot = spec.screenshot as Record<string, unknown> | undefined;
  if (screenshot && typeof screenshot === 'object') {
    const strategy = screenshot.strategy ?? 'auto';
    const cleaned: Record<string, unknown> = { strategy };
    if (strategy === 'explicit') {
      if (screenshot.node_id) cleaned.node_id = screenshot.node_id;
      const ids = (screenshot.node_ids as string[] | undefined)?.filter(Boolean);
      if (ids?.length) cleaned.node_ids = ids;
    }
    if (strategy === 'largest_added_under' && screenshot.under) {
      cleaned.under = screenshot.under;
    }
    if (strategy === 'auto' && screenshot.composite) {
      cleaned.composite = true;
    }
    next = { ...next, screenshot: cleaned };
  }
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
