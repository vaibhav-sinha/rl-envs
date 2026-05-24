export type TaskStatus = 'draft' | 'complete';

export type WizardStep =
  | 'name'
  | 'instruction'
  | 'export'
  | 'gates'
  | 'checks'
  | 'design_system'
  | 'visual'
  | 'metadata'
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
  design: {
    completed: boolean;
    base?: string;
    node_exclusions?: string[];
  };
}

export interface TaskListItem {
  id: string;
  name: string;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  has_design_spec: boolean;
}

export interface DesignListItem {
  name: string;
  has_sidecar: boolean;
  updated_at: string;
}

import type { AllowNoveltyConfig } from './novelty-catalog.js';

export interface EvalSpec {
  schema_version: 1;
  gates?: Record<string, unknown>;
  checks?: Record<string, unknown>[];
  visual?: Record<string, unknown>[];
  metadata_checks?: Record<string, unknown>[];
  design_system?: { allow_novelty: AllowNoveltyConfig };
  /** @deprecated Legacy field; normalized to category_importance on read/write. */
  weights?: Record<string, number>;
  category_importance?: Record<string, number>;
  screenshot?: {
    strategy:
      | 'auto'
      | 'explicit'
      | 'largest_added_frame'
      | 'largest_added_under'
      | 'largest_changed_frame'
      | 'minimal_enclosing'
      | 'all_added_frames';
    node_id?: string;
    node_ids?: string[];
    under?: string;
    composite?: boolean;
  };
}

export interface DesignSpec {
  schema_version: 1;
  base: string;
  node_exclusions?: string[];
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
  designSpec: DesignSpec | null;
  designCompleted: boolean;
  assets: TaskAssetInfo[];
  checkCatalog: typeof import('./check-catalog.js').CHECK_CATALOG;
}
