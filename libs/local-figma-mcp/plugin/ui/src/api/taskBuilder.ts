import { TB_URL } from '../lib/constants';
import type { AllowNoveltyConfig, CheckCatalog } from '../task-builder/types';

async function tbFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${TB_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: { message?: string } }).error?.message ?? res.statusText;
    throw new Error(msg);
  }
  return body as T;
}

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

export interface TaskListItem {
  id: string;
  name: string;
  status: 'draft' | 'complete';
  created_at: string;
  updated_at: string;
  has_design_spec: boolean;
}

export interface DesignListItem {
  name: string;
  has_sidecar: boolean;
  updated_at: string;
}

export interface DesignSpec {
  schema_version: 1;
  base: string;
  node_exclusions?: string[];
}

export interface EvalSpec {
  schema_version: 1;
  gates?: Record<string, unknown>;
  checks?: Record<string, unknown>[];
  visual?: Record<string, unknown>[];
  metadata_checks?: Record<string, unknown>[];
  design_system?: { allow_novelty: AllowNoveltyConfig };
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

export interface FullTask {
  id: string;
  status: string;
  builderState: {
    id: string;
    name: string;
    current_step: WizardStep;
    metadata: {
      description: string;
      difficulty: string;
      category: string;
      verifier_timeout_sec: number;
      agent_timeout_sec: number;
    };
    design: { completed: boolean; base?: string; node_exclusions?: string[] };
  };
  instruction: string;
  evalSpec: EvalSpec | null;
  designSpec: DesignSpec | null;
  designCompleted: boolean;
  assets: Array<{ filename: string; relativePath: string }>;
  checkCatalog: CheckCatalog;
}

export const taskBuilderApi = {
  getCheckCatalog: () => tbFetch<CheckCatalog>('/check-catalog'),
  listDesigns: () => tbFetch<{ designs: DesignListItem[] }>('/designs'),
  listTasks: () => tbFetch<{ tasks: TaskListItem[] }>('/tasks'),
  createTask: (name: string, copyFrom?: string) =>
    tbFetch<{ task: { id: string } }>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ name, copyFrom }),
    }),
  getTask: (id: string) => tbFetch<FullTask>(`/tasks/${id}`),
  patchTask: (id: string, patch: Record<string, unknown>) =>
    tbFetch<FullTask>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteTask: (id: string) => tbFetch<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  saveDesignSpec: (id: string, base: string, node_exclusions?: string[]) =>
    tbFetch<{ saved: boolean }>(`/tasks/${id}/design-spec`, {
      method: 'PATCH',
      body: JSON.stringify({ base, node_exclusions }),
    }),
  uploadAsset: (id: string, filename: string, dataBase64: string) =>
    tbFetch<{ asset: { filename: string } }>(`/tasks/${id}/assets`, {
      method: 'POST',
      body: JSON.stringify({ filename, dataBase64 }),
    }),
  completeTask: (id: string) =>
    tbFetch<{ harborPath: string }>(`/tasks/${id}/complete`, { method: 'POST' }),
  loadHarborAsDraft: (id: string) =>
    tbFetch<{ task: { id: string } }>(`/tasks/${id}/load-harbor`, { method: 'POST' }),
  standaloneExport: (hfcFileName: string, snapshot: unknown) =>
    tbFetch<{ filePath: string }>('/export', {
      method: 'POST',
      body: JSON.stringify({ hfcFileName, snapshot }),
    }),
};
