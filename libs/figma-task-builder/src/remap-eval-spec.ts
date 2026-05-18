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
  for (const key of ['node_id', 'surrounding_context_node_id'] as const) {
    if (typeof out[key] === 'string') {
      out[key] = remapNodeId(out[key], figmaToHfc);
    }
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

  if (spec.design_system) {
    next.design_system = { ...spec.design_system };
  }

  if (spec.weights) {
    next.weights = { ...spec.weights };
  }

  return next;
}
