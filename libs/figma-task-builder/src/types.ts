export type TaskStatus = 'draft' | 'complete';

export type WizardStep =
  | 'name'
  | 'instruction'
  | 'export'
  | 'gates'
  | 'checks'
  | 'design_system'
  | 'visual'
  | 'weights'
  | 'review';

export interface TaskMetadata {
  description: string;
  difficulty: string;
  category: string;
  verifier_timeout_sec: number;
  agent_timeout_sec: number;
}

export interface BuilderState {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  current_step: WizardStep;
  metadata: TaskMetadata;
  export: {
    completed: boolean;
    mode: 'full' | 'exclude' | 'copy' | null;
    excludeNodeIds?: string[];
    copyFromTaskId?: string;
    excludeFigmaNodeIds?: string[];
  };
}

export interface TaskListItem {
  id: string;
  name: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  has_design_export: boolean;
}

export interface EvalSpec {
  schema_version: 1;
  gates?: Record<string, unknown>;
  checks?: Record<string, unknown>[];
  visual?: Record<string, unknown>[];
  design_system?: { allow_novelty?: boolean };
  weights?: Record<string, number>;
}

export interface TaskAssetInfo {
  filename: string;
  relativePath: string;
}

export interface FullTaskPayload {
  id: string;
  status: TaskStatus;
  builderState: BuilderState;
  instruction: string;
  evalSpec: EvalSpec | null;
  exportCompleted: boolean;
  assets: TaskAssetInfo[];
  checkCatalog: typeof import('./check-catalog.js').CHECK_CATALOG;
}
