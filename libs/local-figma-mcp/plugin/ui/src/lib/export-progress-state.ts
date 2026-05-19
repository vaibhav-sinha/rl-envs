export const EXPORT_PHASE_ORDER = [
  'count',
  'meta',
  'serialize',
  'icons',
  'images',
  'upload',
  'finalize',
] as const;

export type ExportProgressPhase = (typeof EXPORT_PHASE_ORDER)[number];

export type PhaseStatus = 'pending' | 'running' | 'done' | 'skipped';

export interface PhaseProgress {
  status: PhaseStatus;
  current: number;
  total: number;
  percent: number;
  detail?: string;
}

export interface MultiPhaseExportProgress {
  phases: Record<ExportProgressPhase, PhaseProgress>;
}

export interface ExportProgressUpdate {
  phase: ExportProgressPhase;
  current: number;
  total: number;
  percent: number;
  detail?: string;
}

export type ExportOutcome =
  | { kind: 'success'; title: string; message: string }
  | { kind: 'error'; title: string; message: string };

export const EXPORT_PHASE_LABEL: Record<ExportProgressPhase, string> = {
  count: 'Count',
  meta: 'Metadata',
  serialize: 'Nodes',
  icons: 'Icons',
  images: 'Images',
  upload: 'Stream parts',
  finalize: 'Finalize',
};

function defaultPhase(status: PhaseStatus = 'pending'): PhaseProgress {
  return { status, current: 0, total: 0, percent: 0 };
}

export function createInitialExportProgress(): MultiPhaseExportProgress {
  const phases = {} as Record<ExportProgressPhase, PhaseProgress>;
  for (const id of EXPORT_PHASE_ORDER) {
    phases[id] = defaultPhase();
  }
  return { phases };
}

function phaseIndex(phase: ExportProgressPhase): number {
  return EXPORT_PHASE_ORDER.indexOf(phase);
}

export function applyExportProgressUpdate(
  prev: MultiPhaseExportProgress | null,
  update: ExportProgressUpdate
): MultiPhaseExportProgress {
  const base = prev ?? createInitialExportProgress();
  const phases = { ...base.phases };
  const idx = phaseIndex(update.phase);

  const skipped =
    update.total <= 0 && update.phase !== 'count' && update.phase !== 'meta';
  const done =
    skipped ||
    (update.total > 0 && update.current >= update.total) ||
    (update.phase === 'count' && update.current >= update.total && update.total > 0);

  // Only mark earlier *running* phases done when a later phase starts. Never mark
  // still-pending phases as skipped (upload runs during serialize, before icons/images).
  for (let i = 0; i < idx; i++) {
    const id = EXPORT_PHASE_ORDER[i]!;
    const p = phases[id];
    if (p.status !== 'running') continue;
    phases[id] = {
      ...p,
      status: 'done',
      percent: 100,
      current: p.total > 0 ? p.total : 1,
      total: p.total > 0 ? p.total : 1,
    };
  }

  phases[update.phase] = {
    status: skipped ? 'skipped' : done ? 'done' : 'running',
    current: update.current,
    total: update.total,
    percent: skipped ? 100 : update.percent,
    detail: update.detail,
  };

  for (let i = idx + 1; i < EXPORT_PHASE_ORDER.length; i++) {
    const id = EXPORT_PHASE_ORDER[i]!;
    if (phases[id].status === 'running') {
      phases[id] = defaultPhase('pending');
    }
  }

  return { phases };
}

export function markAllPhasesDone(progress: MultiPhaseExportProgress): MultiPhaseExportProgress {
  const phases = { ...progress.phases };
  for (const id of EXPORT_PHASE_ORDER) {
    const p = phases[id];
    if (p.status === 'skipped') continue;
    phases[id] = {
      ...p,
      status: 'done',
      percent: 100,
      current: p.total > 0 ? p.total : 1,
      total: p.total > 0 ? p.total : 1,
    };
  }
  return { phases };
}
