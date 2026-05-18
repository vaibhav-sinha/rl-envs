import { TB_URL } from '../lib/constants';
import type { CheckCatalog } from '../task-builder/types';

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
  | 'weights'
  | 'review';

export interface TaskListItem {
  id: string;
  name: string;
  status: 'draft' | 'complete';
  created_at: string;
  updated_at: string;
}

export interface EvalSpec {
  schema_version: 1;
  gates?: Record<string, unknown>;
  checks?: Record<string, unknown>[];
  visual?: Record<string, unknown>[];
  design_system?: { allow_novelty?: boolean };
  weights?: Record<string, number>;
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
    export: { completed: boolean; mode: string | null };
  };
  instruction: string;
  evalSpec: EvalSpec | null;
  exportCompleted: boolean;
  assets: Array<{ filename: string; relativePath: string }>;
  checkCatalog: CheckCatalog;
}

export const taskBuilderApi = {
  getCheckCatalog: () => tbFetch<CheckCatalog>('/check-catalog'),
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
  exportTask: (id: string, snapshot: unknown, mode: 'full' | 'exclude', excludeNodeIds?: string[]) =>
    tbFetch<{ saved: boolean }>(`/tasks/${id}/export`, {
      method: 'POST',
      body: JSON.stringify({ snapshot, mode, excludeNodeIds }),
    }),
  uploadAsset: (id: string, filename: string, dataBase64: string) =>
    tbFetch<{ asset: { filename: string } }>(`/tasks/${id}/assets`, {
      method: 'POST',
      body: JSON.stringify({ filename, dataBase64 }),
    }),
  completeTask: (id: string) =>
    tbFetch<{ harborPath: string }>(`/tasks/${id}/complete`, { method: 'POST' }),
  standaloneExport: (hfcFileName: string, snapshot: unknown) =>
    tbFetch<{ filePath: string }>('/export', {
      method: 'POST',
      body: JSON.stringify({ hfcFileName, snapshot }),
    }),
};
