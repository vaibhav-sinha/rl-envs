import type { EvalSpec } from './types.js';

const HFC_NODE_ID_RE = /^I[0-9]+$/;

/** Map one node id from Figma → HFC; leave HFC ids and unknown ids unchanged. */
export function remapNodeId(id: string, figmaToHfc: Record<string, string>): string {
  if (!id || HFC_NODE_ID_RE.test(id)) return id;
  return figmaToHfc[id] ?? id;
}

function remapIdList(ids: unknown, figmaToHfc: Record<string, string>): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => (typeof id === 'string' ? remapNodeId(id, figmaToHfc) : String(id)));
}

function remapCheck(check: Record<string, unknown>, figmaToHfc: Record<string, string>): Record<string, unknown> {
  const out = { ...check };
  for (const key of ['node_id', 'parent_id', 'scope_id', 'component_id'] as const) {
    if (typeof out[key] === 'string') {
      out[key] = remapNodeId(out[key], figmaToHfc);
    }
  }
  return out;
}

function remapVisual(visual: Record<string, unknown>, figmaToHfc: Record<string, string>): Record<string, unknown> {
  const out = { ...visual };
  if (typeof out.node_id === 'string') {
    out.node_id = remapNodeId(out.node_id, figmaToHfc);
  }
  return out;
}

/** Rewrite eval-spec node id fields using the import-time Figma → HFC map. */
export function remapEvalSpecIds(spec: EvalSpec, figmaToHfc: Record<string, string>): EvalSpec {
  if (!figmaToHfc || Object.keys(figmaToHfc).length === 0) {
    return spec;
  }

  const next: EvalSpec = { schema_version: 1 };

  if (spec.gates) {
    next.gates = { ...spec.gates };
    if (Array.isArray(spec.gates.preserve_ids)) {
      next.gates.preserve_ids = remapIdList(spec.gates.preserve_ids, figmaToHfc);
    }
    if (Array.isArray(spec.gates.allowed_change_inside_ids)) {
      next.gates.allowed_change_inside_ids = remapIdList(
        spec.gates.allowed_change_inside_ids,
        figmaToHfc
      );
    }
  }

  if (spec.checks) {
    next.checks = spec.checks.map((c) => remapCheck(c, figmaToHfc));
  }

  if (spec.visual) {
    next.visual = spec.visual.map((v) => remapVisual(v, figmaToHfc));
  }

  if (spec.metadata_checks) {
    next.metadata_checks = spec.metadata_checks.map((m) => ({ ...m }));
  }

  if (spec.design_system) {
    next.design_system = { ...spec.design_system };
  }

  if (spec.category_importance) {
    next.category_importance = { ...spec.category_importance };
  } else if (spec.weights) {
    const { gates: _g, ...rest } = spec.weights;
    next.category_importance = { ...rest };
  }

  return next;
}
