/** Eval engine types — eval-spec contract and report shapes. */

export type CheckType =
  | 'node_exists'
  | 'min_added_under'
  | 'min_modified_under'
  | 'component_instances_under'
  | 'metadata_only_under'
  | 'property_on_node';

export type VisualMode = 'relative_to_siblings' | 'region_stable' | 'match_asset';

export type VisualFocus = 'largest_added' | 'added' | 'all';

export interface EvalGates {
  require_change?: boolean;
  preserve_ids?: string[];
  forbid_delete_ids?: string[];
  max_change_outside_ids?: string[];
}

export interface EvalCheckSpec {
  id: string;
  type: CheckType;
  required?: boolean;
  node_id?: string;
  parent_id?: string;
  scope_id?: string;
  component_id?: string;
  min?: number;
  min_instances?: number;
  property?: string;
  equals?: string | number | boolean;
}

export interface EvalVisualSpec {
  id: string;
  region_id: string;
  mode: VisualMode;
  instruction: string;
  focus?: VisualFocus;
  reference_asset?: string;
}

export interface EvalWeights {
  gates?: number;
  checks?: number;
  design_system?: number;
  visual?: number;
  heuristics?: number;
}

export interface EvalSpec {
  schema_version: number;
  gates?: EvalGates;
  checks?: EvalCheckSpec[];
  visual?: EvalVisualSpec[];
  weights?: EvalWeights;
}

export type SubCheckCategory = 'gates' | 'checks' | 'design_system' | 'visual' | 'heuristics';

export interface SubCheckResult {
  id: string;
  category: SubCheckCategory;
  score: number;
  applicable: boolean;
  weight: number;
  details?: Record<string, unknown>;
}

export interface EvalReport {
  score: number;
  completion_gate: number;
  raw: number;
  subchecks: SubCheckResult[];
  summary?: string;
}

export type NodeChangeOp = 'add' | 'delete' | 'modify' | 'reparent' | 'replace';

export interface NodeChange {
  nodeId: string;
  operation: NodeChangeOp;
  changedProperties?: string[];
}

export interface EditGraph {
  equal: boolean;
  changes: NodeChange[];
  addedIds: Set<string>;
  deletedIds: Set<string>;
  modifiedIds: Set<string>;
}

export const DEFAULT_WEIGHTS: Required<EvalWeights> = {
  gates: 1.0,
  checks: 0.35,
  design_system: 0.2,
  visual: 0.35,
  heuristics: 0.1,
};

export const METADATA_PROPERTY_KEYS = new Set([
  'name',
  'pluginData',
  'description',
  'locked',
  'exportSettings',
  'reactions',
]);
