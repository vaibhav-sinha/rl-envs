import type { FileEnvelope } from '../model/types.js';
import type { EditGraph, EvalGates, SubCheckResult } from './types.js';
import { descendantIds, nodeExists } from './tree.js';

function gateResult(id: string, score: number, details?: Record<string, unknown>): SubCheckResult {
  return { id, category: 'gates', score, applicable: true, weight: 1, details };
}

export function runGates(
  _before: FileEnvelope,
  after: FileEnvelope,
  graph: EditGraph,
  gates: EvalGates | undefined
): SubCheckResult[] {
  if (!gates) return [];

  const results: SubCheckResult[] = [];

  if (gates.require_change) {
    results.push(
      gateResult('gates.require_change', graph.equal ? 0 : 1, { equal: graph.equal })
    );
  }

  for (const id of gates.preserve_ids ?? []) {
    const ok = nodeExists(after, id);
    results.push(gateResult(`gates.preserve.${id}`, ok ? 1 : 0, { node_id: id }));
  }

  for (const id of gates.forbid_delete_ids ?? []) {
    const deleted = graph.deletedIds.has(id);
    results.push(gateResult(`gates.forbid_delete.${id}`, deleted ? 0 : 1, { node_id: id }));
  }

  if (gates.max_change_outside_ids?.length) {
    const allowed = new Set<string>();
    for (const rootId of gates.max_change_outside_ids) {
      for (const id of descendantIds(after, rootId)) allowed.add(id);
    }

    const changedOutside: string[] = [];
    for (const id of graph.addedIds) {
      if (!allowed.has(id)) changedOutside.push(id);
    }
    for (const id of graph.modifiedIds) {
      if (!allowed.has(id)) changedOutside.push(id);
    }
    for (const id of graph.deletedIds) {
      if (!allowed.has(id)) changedOutside.push(id);
    }

    const totalChanged = graph.addedIds.size + graph.modifiedIds.size + graph.deletedIds.size;
    const outside = changedOutside.length;
    const locality = totalChanged === 0 ? 1 : Math.max(0, 1 - outside / totalChanged);
    results.push(
      gateResult('gates.max_change_outside', locality, {
        changed_outside: outside,
        total_changed: totalChanged,
      })
    );
  }

  return results;
}
