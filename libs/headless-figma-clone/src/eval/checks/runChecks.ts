import { findEnvelopeNode } from '../../engine/DocumentEngine.js';
import type { FileEnvelope } from '../../model/types.js';
import type { DesignCatalog } from '../catalog.js';
import { componentExists } from '../catalog.js';
import { addedIdsUnder, buildEditGraph, isMetadataOnlyChange, modifiedIdsUnder } from '../editGraph.js';
import type { EditGraph, EvalCheckSpec, SubCheckResult } from '../types.js';
import {
  descendantIds,
  getMainComponentId,
  getNodeProperty,
  isInstanceNode,
  nodeExists,
} from '../tree.js';
import { findAllNodes } from '../../traversal/findNodes.js';

function checkResult(
  spec: EvalCheckSpec,
  score: number,
  applicable: boolean,
  details?: Record<string, unknown>
): SubCheckResult {
  return {
    id: `check.${spec.id}`,
    category: 'checks',
    score,
    applicable,
    weight: 1,
    details,
  };
}

function runNodeExists(
  spec: EvalCheckSpec,
  after: FileEnvelope
): SubCheckResult {
  const nodeId = spec.node_id!;
  const ok = nodeExists(after, nodeId);
  return checkResult(spec, ok ? 1 : 0, true, { node_id: nodeId, exists: ok });
}

function runMinAddedUnder(
  spec: EvalCheckSpec,
  graph: EditGraph,
  _before: FileEnvelope,
  after: FileEnvelope
): SubCheckResult {
  const parentId = spec.parent_id!;
  const min = spec.min ?? 1;
  if (!nodeExists(after, parentId)) {
    return checkResult(spec, 0, true, { error: 'parent_missing_in_after' });
  }
  const added = addedIdsUnder(graph, parentId, after);
  const score = Math.min(1, added.length / min);
  return checkResult(spec, score, true, { count: added.length, min, added_ids: added });
}

function runMinModifiedUnder(
  spec: EvalCheckSpec,
  graph: EditGraph,
  after: FileEnvelope
): SubCheckResult {
  const parentId = spec.parent_id!;
  const min = spec.min ?? 1;
  if (!nodeExists(after, parentId)) {
    return checkResult(spec, 0, true, { error: 'parent_missing_in_after' });
  }
  const modified = modifiedIdsUnder(graph, parentId, after);
  const score = Math.min(1, modified.length / min);
  return checkResult(spec, score, true, { count: modified.length, min, modified_ids: modified });
}

function countComponentInstancesUnder(
  envelope: FileEnvelope,
  scopeId: string,
  componentId: string
): number {
  const scope = descendantIds(envelope, scopeId);
  let count = 0;
  for (const node of findAllNodes(envelope.document)) {
    if (!scope.has(node.id)) continue;
    if (isInstanceNode(node) && getMainComponentId(node) === componentId) count++;
  }
  return count;
}

function runComponentInstancesUnder(
  spec: EvalCheckSpec,
  after: FileEnvelope,
  catalog: DesignCatalog
): SubCheckResult {
  const scopeId = spec.scope_id!;
  const componentId = spec.component_id!;
  const minInstances = spec.min_instances ?? 1;

  if (!componentExists(catalog, componentId)) {
    return checkResult(spec, 0, false, { error: 'component_not_in_catalog', component_id: componentId });
  }
  if (!nodeExists(after, scopeId)) {
    return checkResult(spec, 0, true, { error: 'scope_missing_in_after' });
  }

  const count = countComponentInstancesUnder(after, scopeId, componentId);
  const score = Math.min(1, count / minInstances);
  return checkResult(spec, score, true, { count, min_instances: minInstances, component_id: componentId });
}

function runMetadataOnlyUnder(
  spec: EvalCheckSpec,
  graph: EditGraph,
  _before: FileEnvelope,
  after: FileEnvelope
): SubCheckResult {
  const parentId = spec.parent_id!;
  const scope = descendantIds(after, parentId);

  let violations = 0;
  for (const change of graph.changes) {
    if (!scope.has(change.nodeId)) continue;
    if (change.operation === 'add' || change.operation === 'delete') {
      violations++;
      continue;
    }
    if (change.operation === 'modify' && !isMetadataOnlyChange(change.changedProperties)) {
      violations++;
    }
  }

  const score = violations === 0 ? 1 : 0;
  return checkResult(spec, score, true, { violations });
}

function runPropertyOnNode(spec: EvalCheckSpec, after: FileEnvelope): SubCheckResult {
  const nodeId = spec.node_id!;
  const node = findEnvelopeNode(after, nodeId);
  if (!node) return checkResult(spec, 0, true, { error: 'node_missing' });

  const actual = getNodeProperty(node, spec.property!);
  const expected = spec.equals;
  const ok = actual === expected || String(actual) === String(expected);
  return checkResult(spec, ok ? 1 : 0, true, { property: spec.property, expected, actual });
}

export function runSpecChecks(
  spec: EvalCheckSpec,
  before: FileEnvelope,
  after: FileEnvelope,
  graph: EditGraph,
  catalog: DesignCatalog
): SubCheckResult {
  switch (spec.type) {
    case 'node_exists':
      return runNodeExists(spec, after);
    case 'min_added_under':
      return runMinAddedUnder(spec, graph, before, after);
    case 'min_modified_under':
      return runMinModifiedUnder(spec, graph, after);
    case 'component_instances_under':
      return runComponentInstancesUnder(spec, after, catalog);
    case 'metadata_only_under':
      return runMetadataOnlyUnder(spec, graph, before, after);
    case 'property_on_node':
      return runPropertyOnNode(spec, after);
    default:
      return checkResult(spec as EvalCheckSpec, 0, false, { error: 'unknown_type' });
  }
}

export function runAllChecks(
  checks: EvalCheckSpec[] | undefined,
  before: FileEnvelope,
  after: FileEnvelope,
  catalog: DesignCatalog
): SubCheckResult[] {
  if (!checks?.length) return [];
  const graph = buildEditGraph(before, after);
  return checks.map((c) => runSpecChecks(c, before, after, graph, catalog));
}
