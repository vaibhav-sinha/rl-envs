import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  taskBuilderApi,
  type EvalSpec,
  type FullTask,
  type TaskListItem,
  type WizardStep,
} from '../api/taskBuilder';
import { logExportError } from '../../../src/exportError.js';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import {
  applyExportProgressSnapshot,
  applyFinalizeProgress,
  captureScreenshot,
  createInitialExportProgress,
  exportSnapshotStreaming,
  finishExportStreamSession,
  replayFinishExportStreamSession,
  pickExcludeNodeIds,
  pickNodeId,
} from '../lib/plugin-bridge';
import type { ExportOutcome, MultiPhaseExportProgress } from '../lib/export-progress-state';
import { ExportOutcomeBanner, ExportProgressPanel } from '../components/ExportProgress';
import { PageMultiSelect } from '../components/PageMultiSelect';
import { useFilePages } from '../hooks/useFilePages';
import { WIZARD_STEPS, stepMeta } from './catalog-helpers';
import { DEFAULT_CATEGORY_IMPORTANCE, normalizeEvalSpec } from './category-importance';
import { sanitizeEvalSpecForSave } from './sanitize-eval-spec';
import { CheckCard } from './components/CheckCard';
import { FieldHelp } from './components/FieldHelp';
import { SectionIntro } from './components/SectionIntro';
import {
  AUTO_VISUAL_TYPES,
  DEFAULT_DESIGN_FIT_PROMPT,
  ensureDefaultVisualChecks,
} from './default-visual-checks';
import { buildCheckOptions, buildMetadataOptions, buildVisualOptions, TypeSelect } from './components/TypeSelect';
import { MetadataCard } from './components/MetadataCard';
import { VisualCard } from './components/VisualCard';
import { EvalSpecSummary } from './EvalSpecSummary';
import { isCheckCatalog, useCheckCatalog } from './useCheckCatalog';

const STEPS = WIZARD_STEPS.map((s) => s.id);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function TaskBuilderTab({ onLog }: { onLog: (t: string, e?: boolean) => void }) {
  const filePages = useFilePages();
  const [view, setView] = useState<'idle' | 'list' | 'wizard'>('idle');
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<FullTask | null>(null);
  const [step, setStep] = useState<WizardStep>('name');
  const [busy, setBusy] = useState(false);

  const [nameInput, setNameInput] = useState('');
  const [instruction, setInstruction] = useState('');
  const [meta, setMeta] = useState({
    description: '',
    difficulty: 'easy',
    category: 'design',
    verifier_timeout_sec: 300,
    agent_timeout_sec: 600,
  });
  const [evalSpec, setEvalSpec] = useState<EvalSpec>({
    schema_version: 1,
    gates: { require_change: true, no_detached_nodes: true },
    checks: [],
    visual: [
      { id: 'good_design_1', type: 'good_design' },
      { id: 'task_completeness_1', type: 'task_completeness' },
    ],
    metadata_checks: [],
    category_importance: { ...DEFAULT_CATEGORY_IMPORTANCE },
  });

  const [exportProgress, setExportProgress] = useState<MultiPhaseExportProgress | null>(null);
  const [exportOutcome, setExportOutcome] = useState<ExportOutcome | null>(null);
  const [pendingExportId, setPendingExportId] = useState<string | null>(null);
  const [pendingExportMode, setPendingExportMode] = useState<'full' | 'exclude'>('full');
  const [pendingExcludeNodeIds, setPendingExcludeNodeIds] = useState<string[] | undefined>();
  const [showExcludeDialog, setShowExcludeDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromTaskId, setCopyFromTaskId] = useState<string | null>(null);
  const [newCheckType, setNewCheckType] = useState('must_contain_text');
  const [newVisualType, setNewVisualType] = useState('design_consistency');
  const [newMetadataType, setNewMetadataType] = useState('diff');

  const catalog = useCheckCatalog(task?.checkCatalog);
  const catalogReady = isCheckCatalog(catalog);
  const checkOptions = useMemo(() => buildCheckOptions(catalog), [catalog]);
  const visualOptions = useMemo(() => buildVisualOptions(catalog), [catalog]);
  const metadataOptions = useMemo(() => buildMetadataOptions(catalog), [catalog]);

  useEffect(() => {
    if (checkOptions.length && !checkOptions.some((o) => o.value === newCheckType)) {
      setNewCheckType(checkOptions[0]!.value);
    }
  }, [checkOptions, newCheckType]);

  useEffect(() => {
    if (visualOptions.length && !visualOptions.some((o) => o.value === newVisualType)) {
      setNewVisualType(visualOptions[0]!.value);
    }
  }, [visualOptions, newVisualType]);

  useEffect(() => {
    if (metadataOptions.length && !metadataOptions.some((o) => o.value === newMetadataType)) {
      setNewMetadataType(metadataOptions[0]!.value);
    }
  }, [metadataOptions, newMetadataType]);

  const refreshList = useCallback(async () => {
    try {
      const { tasks: list } = await taskBuilderApi.listTasks();
      setTasks(list);
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    }
  }, [onLog]);

  const loadTask = useCallback(async (id: string) => {
    const t = await taskBuilderApi.getTask(id);
    setTask(t);
    setTaskId(id);
    setInstruction(t.instruction);
    setMeta(t.builderState.metadata);
    if (t.evalSpec) {
      setEvalSpec(ensureDefaultVisualChecks(normalizeEvalSpec(t.evalSpec as Record<string, unknown>)));
    }
    const resumedStep = t.builderState.current_step;
    setStep(
      resumedStep === 'review' && t.exportCompleted ? 'instruction' : resumedStep
    );
    setView('wizard');
  }, []);

  useEffect(() => {
    if (view === 'list') void refreshList();
  }, [view, refreshList]);

  const startCreate = () => {
    setNameInput('');
    setStep('name');
    setTaskId(null);
    setTask(null);
    setView('wizard');
  };

  const createTask = async () => {
    const id = slugify(nameInput);
    if (!id) {
      onLog('Enter a valid task name (lowercase, hyphens)', true);
      return;
    }
    setBusy(true);
    try {
      await taskBuilderApi.createTask(id);
      await loadTask(id);
      setStep('instruction');
      onLog(`Created draft: ${id}`);
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (!taskId) return;
    if (!confirm('Discard this draft?')) return;
    setBusy(true);
    try {
      await taskBuilderApi.deleteTask(taskId);
      setView('idle');
      setTaskId(null);
      setTask(null);
      onLog('Draft discarded');
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
    }
  };

  const saveAndNext = async (next: WizardStep) => {
    if (!taskId) return;
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { current_step: next };
      if (step === 'instruction') {
        patch.instruction = instruction;
        patch.metadata = meta;
      }
      if (['gates', 'checks', 'design_system', 'visual', 'metadata', 'weights'].includes(step)) {
        patch.evalSpec = sanitizeEvalSpecForSave(ensureDefaultVisualChecks(evalSpec));
      }
      const updated = await taskBuilderApi.patchTask(taskId, patch);
      setTask(updated);
      if (updated.evalSpec) setEvalSpec(updated.evalSpec);
      setStep(next);
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
    }
  };

  const reportExportProgress = (snapshot: Parameters<typeof applyExportProgressSnapshot>[1]) => {
    setExportProgress((prev) => applyExportProgressSnapshot(prev, snapshot));
  };

  const runExport = async (mode: 'full' | 'exclude', excludeNodeIds?: string[]) => {
    if (!taskId) return;
    setBusy(true);
    setExportProgress(createInitialExportProgress());
    setExportOutcome(null);
    setPendingExportId(null);
    let streamFinished = false;
    try {
      onLog('Streaming Figma export…');
      const { exportId } = await exportSnapshotStreaming(taskId, {
        excludeNodeIds,
        includePageIds: [...filePages.selectedPageIds],
        onProgress: reportExportProgress,
      });
      streamFinished = true;

      try {
        setExportProgress((prev) =>
          prev
            ? applyFinalizeProgress(prev, 0, 1, 'Saving to task draft…')
            : prev
        );
        onLog('Finalizing on Task Builder…');
        await finishExportStreamSession(exportId, {
          taskId,
          mode,
          excludeNodeIds,
        });
        setExportProgress((prev) => (prev ? applyFinalizeProgress(prev, 1, 1) : prev));
      } catch (finalizeError) {
        setPendingExportId(exportId);
        setPendingExportMode(mode);
        setPendingExcludeNodeIds(excludeNodeIds);
        throw finalizeError;
      }

      const updated = await taskBuilderApi.getTask(taskId);
      setTask(updated);
      setExportOutcome({
        kind: 'success',
        title: 'Export complete',
        message: `Baseline design saved for task “${taskId}”. Continue to gates.`,
      });
      onLog('Design exported to draft');
      setStep('gates');
    } catch (e) {
      const message = logExportError(
        streamFinished ? 'ui/TaskBuilder/exportFinalize' : 'ui/TaskBuilder/exportStream',
        e
      );
      setExportOutcome({
        kind: 'error',
        title: streamFinished ? 'Finalize failed' : 'Export failed',
        message,
      });
      onLog(message, true);
    } finally {
      setBusy(false);
      setShowExcludeDialog(false);
    }
  };

  const exportableTasks = useMemo(
    () => tasks.filter((t) => t.has_design_export && t.id !== taskId),
    [tasks, taskId]
  );

  const runCopyExport = async (excludeFigmaNodeIds?: string[]) => {
    if (!taskId || !copyFromTaskId) return;
    setBusy(true);
    try {
      const result = await taskBuilderApi.copyExportTask(taskId, copyFromTaskId, excludeFigmaNodeIds);
      if (
        excludeFigmaNodeIds &&
        excludeFigmaNodeIds.length > 0 &&
        !result.exclusions_applied
      ) {
        onLog(
          'Source export has no Figma layer mapping; exclusions were ignored. Re-export the source task to enable exclusions.',
          true
        );
      }
      const updated = await taskBuilderApi.getTask(taskId);
      setTask(updated);
      onLog(`Design copied from ${copyFromTaskId}`);
      setStep('gates');
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
      setShowCopyDialog(false);
      setCopyFromTaskId(null);
    }
  };

  const openCopyDialog = async () => {
    setShowCopyDialog(true);
    setCopyFromTaskId(null);
    await refreshList();
  };

  const complete = async () => {
    if (!taskId) return;
    setBusy(true);
    try {
      const r = await taskBuilderApi.completeTask(taskId);
      onLog(`Finalized to ${r.harborPath}`);
      setView('idle');
      setTaskId(null);
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
    }
  };

  const editHarbor = async (id: string) => {
    setBusy(true);
    try {
      await taskBuilderApi.loadHarborAsDraft(id);
      await loadTask(id);
      onLog(`Loaded harbor task ${id} as draft`);
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
    }
  };

  const addCheck = (type: string) => {
    const id = `${type}_${(evalSpec.checks?.length ?? 0) + 1}`;
    const base: Record<string, unknown> = { id, type, required: true };
    if (type === 'must_contain_text') Object.assign(base, { contains: '', scope: 'new_frames' });
    if (type === 'must_contain_image') Object.assign(base, { scope: 'new_frames' });
    if (type === 'min_added_under' || type === 'min_modified_under')
      Object.assign(base, { parent_id: '', min: 1 });
    if (type === 'component_instances_under')
      Object.assign(base, { scope_id: '', component_id: '', min_instances: 1 });
    if (type === 'metadata_only_under') Object.assign(base, { parent_id: '' });
    if (type === 'property_on_node')
      Object.assign(base, { node_id: '', property: 'name', equals: '' });
    setEvalSpec({ ...evalSpec, checks: [...(evalSpec.checks ?? []), base] });
  };

  const addVisual = (type: string) => {
    const id = `${type}_${(evalSpec.visual?.length ?? 0) + 1}`;
    const base: Record<string, unknown> = { id, type };
    if (type === 'design_consistency') {
      Object.assign(base, {
        reference_asset: '',
        criteria: ['Describe what the agent result should match in the reference'],
      });
    }
    if (type === 'design_fit') {
      Object.assign(base, { node_id: '', evaluation_prompt: DEFAULT_DESIGN_FIT_PROMPT });
    }
    if (type === 'design_preference') Object.assign(base, { reference_asset: '' });
    setEvalSpec(ensureDefaultVisualChecks({ ...evalSpec, visual: [...(evalSpec.visual ?? []), base] }));
  };

  const addMetadata = (type: string) => {
    const id = `${type}_${(evalSpec.metadata_checks?.length ?? 0) + 1}`;
    const base: Record<string, unknown> = { id, type };
    setEvalSpec({
      ...evalSpec,
      metadata_checks: [...(evalSpec.metadata_checks ?? []), base],
    });
  };

  const updateCheck = (index: number, patch: Record<string, unknown>) => {
    const checks = [...(evalSpec.checks ?? [])];
    checks[index] = { ...checks[index], ...patch };
    setEvalSpec({ ...evalSpec, checks });
  };

  const updateVisual = (index: number, patch: Record<string, unknown>) => {
    const visual = [...(evalSpec.visual ?? [])];
    visual[index] = { ...visual[index], ...patch };
    setEvalSpec({ ...evalSpec, visual });
  };

  const removeCheck = (index: number) => {
    const checks = [...(evalSpec.checks ?? [])];
    checks.splice(index, 1);
    setEvalSpec({ ...evalSpec, checks });
  };

  const removeVisual = (index: number) => {
    const visual = [...(evalSpec.visual ?? [])];
    const entry = visual[index];
    if (entry && (AUTO_VISUAL_TYPES as readonly string[]).includes(String(entry.type))) {
      return;
    }
    visual.splice(index, 1);
    setEvalSpec({ ...evalSpec, visual });
  };

  const removeMetadata = (index: number) => {
    const metadata_checks = [...(evalSpec.metadata_checks ?? [])];
    metadata_checks.splice(index, 1);
    setEvalSpec({ ...evalSpec, metadata_checks });
  };

  const appendPickedId = (field: 'preserve_ids' | 'allowed_change_inside_ids', id: string) => {
    const current = ((evalSpec.gates?.[field] as string[]) ?? []).slice();
    if (!current.includes(id)) current.push(id);
    setEvalSpec({ ...evalSpec, gates: { ...evalSpec.gates, [field]: current } });
  };

  if (view === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4">
        <p className="text-[11px] text-muted text-center m-0 max-w-[240px]">
          Build Harbor figma-design tasks with guided checks, gates, and visual judges.
        </p>
        <Button variant="primary" onClick={startCreate}>
          Create task
        </Button>
        <Button variant="ghost" onClick={() => setView('list')}>
          Open existing task
        </Button>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className="flex flex-col flex-1 min-h-0 p-2">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-semibold">Your tasks</span>
          <Button size="sm" variant="ghost" onClick={() => setView('idle')}>
            Back
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto space-y-1">
          {tasks.length === 0 ? (
            <p className="text-[10px] text-muted m-0 p-2">No drafts or completed tasks yet.</p>
          ) : (
            tasks.map((t) => (
              <button
                key={`${t.id}-${t.status}`}
                type="button"
                className="w-full text-left rounded-md border border-[#444] bg-[#252525] p-2.5 hover:bg-[#333] transition-colors"
                onClick={() => {
                  if (t.status === 'complete') void editHarbor(t.id);
                  else void loadTask(t.id);
                }}
              >
                <div className="flex justify-between gap-2">
                  <span className="text-[11px] font-medium text-foreground">{t.name}</span>
                  <span
                    className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      t.status === 'complete' ? 'bg-[#2d5a3d]/40 text-accent' : 'bg-[#333] text-muted'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <span className="block text-[10px] text-muted mt-1">
                  {new Date(t.updated_at).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
        <Button className="mt-2" size="sm" onClick={() => void refreshList()}>
          Refresh
        </Button>
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);
  const currentStep = stepMeta(step);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="p-2 border-b border-[#333] flex justify-between items-center shrink-0 gap-2">
        <span className="text-[11px] font-semibold truncate">{taskId ?? 'New task'}</span>
        <Button size="sm" variant="destructive" disabled={!taskId || busy} onClick={() => void discard()}>
          Discard
        </Button>
      </header>

      <div className="px-2 py-1.5 border-b border-[#333] shrink-0 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold text-foreground">
            {currentStep.label}
          </span>
          <span className="text-[10px] text-muted shrink-0">
            {stepIndex + 1} / {STEPS.length}
          </span>
        </div>
        <p className="text-[10px] text-muted m-0">{currentStep.hint}</p>
        <div className="flex gap-0.5 overflow-x-auto pb-0.5">
          {WIZARD_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              title={s.label}
              disabled={!taskId && s.id !== 'name'}
              onClick={() => taskId && setStep(s.id)}
              className={`h-1 flex-1 min-w-[12px] rounded-full transition-colors ${
                i <= stepIndex ? 'bg-accent/70' : 'bg-[#444]'
              } ${taskId ? 'cursor-pointer' : 'cursor-default'}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {taskId && step !== 'name' && step !== 'review' ? (
          <div className="px-2 pt-2 shrink-0 max-h-[45%] min-h-0 overflow-auto">
            <EvalSpecSummary
              spec={evalSpec}
              catalog={catalog}
              taskInstruction={instruction}
              defaultExpanded={false}
            />
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-auto p-2 space-y-3">
        {step === 'name' && (
          <>
            <SectionIntro
              title="Task identifier"
              description="This becomes the folder name under envs/figma-design/tasks/. Use lowercase letters, numbers, and hyphens."
            />
            <div className="space-y-1">
              <Label>Task name</Label>
              <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="my-task" />
            </div>
          </>
        )}

        {step === 'instruction' && (
          <>
            <SectionIntro
              title="Agent instruction"
              description="Markdown shown to the agent. Also used by Task completeness visual checks unless you add separate judge instructions."
            />
            <div className="space-y-1">
              <Label>Instruction</Label>
              <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={8} />
            </div>
            <div className="space-y-1">
              <Label>Short description</Label>
              <Input
                value={meta.description}
                onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                placeholder="One-line summary for task metadata"
              />
            </div>
            <div className="space-y-1">
              <Label>Difficulty</Label>
              <Input value={meta.difficulty} onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })} />
            </div>
          </>
        )}

        {step === 'export' && (
          <>
            <SectionIntro
              title="Baseline export"
              description="Captures the current Figma file as design.hfc.json — the before state agents are graded against. Only selected pages are included; exclusions apply within that scope."
            />
            <PageMultiSelect
              pages={filePages.pages}
              selectedIds={filePages.selectedPageIds}
              onToggle={filePages.togglePage}
              onSelectAll={filePages.selectAll}
              onClearAll={filePages.clearAll}
              onRefresh={() => void filePages.refresh()}
              disabled={busy}
              loading={filePages.loading}
              error={filePages.error}
            />
            {busy && exportProgress ? <ExportProgressPanel progress={exportProgress} /> : null}
            {exportOutcome ? (
              <ExportOutcomeBanner outcome={exportOutcome} onDismiss={() => setExportOutcome(null)} />
            ) : null}
            {pendingExportId && taskId ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true);
                    try {
                      onLog('Replaying finalize from disk…');
                      await replayFinishExportStreamSession(pendingExportId, {
                        taskId,
                        mode: pendingExportMode,
                        excludeNodeIds: pendingExcludeNodeIds,
                      });
                      setPendingExportId(null);
                      const updated = await taskBuilderApi.getTask(taskId);
                      setTask(updated);
                      setExportOutcome({
                        kind: 'success',
                        title: 'Export complete',
                        message: `Baseline design saved for task “${taskId}”.`,
                      });
                      setStep('gates');
                    } catch (e) {
                      onLog(e instanceof Error ? e.message : String(e), true);
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
              >
                Retry finalize
              </Button>
            ) : null}
            <Button
              variant="primary"
              disabled={busy || !filePages.hasSelection || filePages.loading}
              onClick={() => void runExport('full')}
            >
              {filePages.allSelected ? 'Export entire file' : 'Export selected pages'}
            </Button>
            <Button
              disabled={busy || !filePages.hasSelection || filePages.loading}
              onClick={() => setShowExcludeDialog(true)}
            >
              Export with exclusions
            </Button>
            <Button disabled={busy} onClick={() => void openCopyDialog()}>
              Copy from existing task
            </Button>
            {showExcludeDialog ? (
              <div className="rounded-md border border-[#555] p-2.5 space-y-2 bg-[#252525]">
                <p className="text-[10px] m-0 text-muted">
                  Select nodes in Figma to exclude from the baseline, then confirm.
                </p>
                <Button
                  size="sm"
                  disabled={!filePages.hasSelection || filePages.loading}
                  onClick={async () => {
                    try {
                      const ids = await pickExcludeNodeIds();
                      onLog(`Excluding ${ids.length} node(s)`);
                      await runExport('exclude', ids);
                    } catch (e) {
                      onLog(e instanceof Error ? e.message : String(e), true);
                    }
                  }}
                >
                  Pick exclusions & export
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowExcludeDialog(false)}>
                  Cancel
                </Button>
              </div>
            ) : null}
            {showCopyDialog ? (
              <div className="rounded-md border border-[#555] p-2.5 space-y-2 bg-[#252525]">
                {!copyFromTaskId ? (
                  <>
                    <p className="text-[10px] m-0 text-muted">
                      Select a task that already has a design export.
                    </p>
                    {exportableTasks.length === 0 ? (
                      <p className="text-[10px] m-0 text-muted">No other tasks with design exports found.</p>
                    ) : (
                      <div className="max-h-[140px] overflow-auto space-y-1">
                        {exportableTasks.map((t) => (
                          <button
                            key={`copy-${t.id}`}
                            type="button"
                            className="w-full text-left rounded border border-[#444] bg-[#1e1e1e] px-2 py-1.5 text-[10px] hover:bg-[#333]"
                            onClick={() => setCopyFromTaskId(t.id)}
                          >
                            <span className="font-medium">{t.name}</span>
                            <span className="text-muted ml-2">{t.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] m-0 text-muted">
                      Copying from <span className="font-mono text-foreground">{copyFromTaskId}</span>.
                      Optionally exclude layers from the open Figma file.
                    </p>
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={busy}
                      onClick={() => void runCopyExport()}
                    >
                      Copy without exclusions
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          const ids = await pickExcludeNodeIds();
                          onLog(`Excluding ${ids.length} layer(s) from copy`);
                          await runCopyExport(ids);
                        } catch (e) {
                          onLog(e instanceof Error ? e.message : String(e), true);
                        }
                      }}
                    >
                      Pick exclusions & copy
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCopyFromTaskId(null)}>
                      Back
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCopyDialog(false);
                    setCopyFromTaskId(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            {task?.exportCompleted ? (
              <p className="text-accent text-[10px] m-0">✓ Export complete — continue to gates.</p>
            ) : null}
          </>
        )}

        {step === 'gates' && catalogReady && catalog ? (
          <>
            <SectionIntro title={catalog.gates.title} description={catalog.gates.description} />
            <div className="flex items-start gap-2">
              <Switch
                checked={!!evalSpec.gates?.require_change}
                onCheckedChange={(v) =>
                  setEvalSpec({ ...evalSpec, gates: { ...evalSpec.gates, require_change: v } })
                }
              />
              <FieldHelp
                label={catalog.gates.fields.require_change.label}
                description={catalog.gates.fields.require_change.description}
              />
            </div>
            <div className="flex items-start gap-2">
              <Switch
                checked={!!evalSpec.gates?.no_detached_nodes}
                onCheckedChange={(v) =>
                  setEvalSpec({
                    ...evalSpec,
                    gates: { ...evalSpec.gates, no_detached_nodes: v || undefined },
                  })
                }
              />
              <FieldHelp
                label={catalog.gates.fields.no_detached_nodes.label}
                description={catalog.gates.fields.no_detached_nodes.description}
              />
            </div>
            <div className="flex items-start gap-2">
              <Switch
                checked={!!evalSpec.gates?.additions_only}
                onCheckedChange={(v) =>
                  setEvalSpec({ ...evalSpec, gates: { ...evalSpec.gates, additions_only: v || undefined } })
                }
              />
              <FieldHelp
                label={catalog.gates.fields.additions_only.label}
                description={catalog.gates.fields.additions_only.description}
              />
            </div>
            <div className="space-y-1">
              <FieldHelp
                label={catalog.gates.fields.preserve_ids.label}
                description={catalog.gates.fields.preserve_ids.description}
              />
              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {((evalSpec.gates?.preserve_ids as string[]) ?? []).map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 text-[9px] font-mono bg-[#333] rounded px-1.5 py-0.5"
                  >
                    {id}
                    <button
                      type="button"
                      className="text-muted hover:text-destructive"
                      onClick={() =>
                        setEvalSpec({
                          ...evalSpec,
                          gates: {
                            ...evalSpec.gates,
                            preserve_ids: ((evalSpec.gates?.preserve_ids as string[]) ?? []).filter(
                              (x) => x !== id
                            ),
                          },
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() =>
                  void pickNodeId()
                    .then((id) => appendPickedId('preserve_ids', id))
                    .catch((e) => onLog(String(e), true))
                }
              >
                Add node to preserve
              </Button>
            </div>
            <div className="space-y-1">
              <FieldHelp
                label={catalog.gates.fields.allowed_change_inside_ids.label}
                description={catalog.gates.fields.allowed_change_inside_ids.description}
              />
              <div className="flex flex-wrap gap-1 min-h-[24px]">
                {((evalSpec.gates?.allowed_change_inside_ids as string[]) ?? []).map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 text-[9px] font-mono bg-[#333] rounded px-1.5 py-0.5"
                  >
                    {id}
                    <button
                      type="button"
                      className="text-muted hover:text-destructive"
                      onClick={() =>
                        setEvalSpec({
                          ...evalSpec,
                          gates: {
                            ...evalSpec.gates,
                            allowed_change_inside_ids: (
                              (evalSpec.gates?.allowed_change_inside_ids as string[]) ?? []
                            ).filter((x) => x !== id),
                          },
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() =>
                  void pickNodeId()
                    .then((id) => appendPickedId('allowed_change_inside_ids', id))
                    .catch((e) => onLog(String(e), true))
                }
              >
                Add allowed-change root
              </Button>
            </div>
          </>
        ) : null}

        {step === 'checks' && catalogReady && catalog ? (
          <>
            <SectionIntro title={catalog.checks.title} description={catalog.checks.description} />
            <p className="text-[10px] text-muted m-0">
              Add as many checks as you need — each runs independently and must pass (unless marked optional).
            </p>
            <div className="rounded-md border border-dashed border-[#555] p-2.5 space-y-2 bg-[#252525]/50">
              <p className="text-[10px] font-medium m-0 text-foreground">Add a check</p>
              <TypeSelect options={checkOptions} value={newCheckType} onChange={setNewCheckType} />
              <Button size="sm" variant="primary" className="w-full" onClick={() => addCheck(newCheckType)}>
                + Add check
              </Button>
            </div>
            {(evalSpec.checks ?? []).length === 0 ? (
              <p className="text-[10px] text-muted m-0 text-center py-4">No checks yet.</p>
            ) : (
              (evalSpec.checks ?? []).map((c, i) => (
                <CheckCard
                  key={String(c.id)}
                  check={c}
                  index={i}
                  catalog={catalog}
                  onChange={(patch) => updateCheck(i, patch)}
                  onRemove={() => removeCheck(i)}
                  onPickNode={(field) =>
                    void pickNodeId()
                      .then((id) => updateCheck(i, { [field]: id }))
                      .catch((err) => onLog(String(err), true))
                  }
                />
              ))
            )}
          </>
        ) : null}

        {step === 'design_system' && catalogReady && catalog ? (
          <>
            <SectionIntro
              title={catalog.design_system.title}
              description={catalog.design_system.description}
            />
            <div className="flex items-start gap-2">
              <Switch
                checked={!!evalSpec.design_system?.allow_novelty}
                onCheckedChange={(v) =>
                  setEvalSpec({ ...evalSpec, design_system: { allow_novelty: v } })
                }
              />
              <FieldHelp
                label={catalog.design_system.fields.allow_novelty.label}
                description={catalog.design_system.fields.allow_novelty.description}
              />
            </div>
            <p className="text-[10px] text-muted m-0">{catalog.heuristics.description}</p>
          </>
        ) : null}

        {step === 'visual' && catalogReady && catalog ? (
          <>
            <SectionIntro title={catalog.visual.title} description={catalog.visual.description} />
            <p className="text-[10px] text-muted m-0">
              Good design and task completeness are included by default. Add optional checks for reference
              comparison, fit, or preference.
            </p>
            <div className="rounded-md border border-dashed border-[#555] p-2.5 space-y-2 bg-[#252525]/50">
              <p className="text-[10px] font-medium m-0 text-foreground">Add a visual check</p>
              <TypeSelect options={visualOptions} value={newVisualType} onChange={setNewVisualType} />
              <Button size="sm" variant="primary" className="w-full" onClick={() => addVisual(newVisualType)}>
                + Add visual check
              </Button>
            </div>
            {(evalSpec.visual ?? []).length === 0 ? (
              <p className="text-[10px] text-muted m-0 text-center py-4">No visual checks yet.</p>
            ) : (
              (evalSpec.visual ?? []).map((v, i) => (
                <VisualCard
                  key={String(v.id)}
                  visual={v}
                  index={i}
                  catalog={catalog}
                  taskInstruction={instruction}
                  taskId={taskId}
                  onChange={(patch) => updateVisual(i, patch)}
                  onRemove={() => removeVisual(i)}
                  onPickNode={(field) =>
                    void pickNodeId()
                      .then((id) => updateVisual(i, { [field]: id }))
                      .catch((err) => onLog(String(err), true))
                  }
                  onLog={onLog}
                />
              ))
            )}
          </>
        ) : null}

        {step === 'metadata' && catalogReady && catalog?.metadata_checks ? (
          <>
            <SectionIntro
              title={catalog.metadata_checks.title}
              description={catalog.metadata_checks.description}
            />
            <div className="rounded-md border border-dashed border-[#555] p-2.5 space-y-2 bg-[#252525]/50">
              <p className="text-[10px] font-medium m-0 text-foreground">Add a metadata check</p>
              <TypeSelect
                options={metadataOptions}
                value={newMetadataType}
                onChange={setNewMetadataType}
              />
              <Button
                size="sm"
                variant="primary"
                className="w-full"
                onClick={() => addMetadata(newMetadataType)}
              >
                + Add metadata check
              </Button>
            </div>
            {(evalSpec.metadata_checks ?? []).length === 0 ? (
              <p className="text-[10px] text-muted m-0 text-center py-4">No metadata checks yet.</p>
            ) : (
              (evalSpec.metadata_checks ?? []).map((m, i) => (
                <MetadataCard
                  key={String(m.id)}
                  entry={m}
                  index={i}
                  catalog={catalog}
                  onRemove={() => removeMetadata(i)}
                />
              ))
            )}
          </>
        ) : null}

        {step === 'weights' && catalogReady && catalog ? (
          <>
            <SectionIntro
              title={catalog.category_importance.title}
              description={catalog.category_importance.description}
            />
            {Object.entries(catalog.category_importance.defaults).map(([k, defaultVal]) => {
              const v = evalSpec.category_importance?.[k] ?? defaultVal;
              return (
                <div key={k} className="space-y-1">
                  <FieldHelp
                    label={k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    description={`Default: ${defaultVal}`}
                  />
                  <Input
                    type="number"
                    step="0.05"
                    min={0.01}
                    value={v}
                    onChange={(e) =>
                      setEvalSpec({
                        ...evalSpec,
                        category_importance: {
                          ...(evalSpec.category_importance ?? DEFAULT_CATEGORY_IMPORTANCE),
                          [k]: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              );
            })}
          </>
        ) : null}

        {['gates', 'checks', 'design_system', 'visual', 'metadata', 'weights'].includes(step) &&
        !catalogReady ? (
          <p className="text-[10px] text-muted m-0">Loading check catalog…</p>
        ) : null}

        {step === 'review' && (
          <>
            <EvalSpecSummary
              spec={evalSpec}
              catalog={catalog}
              taskInstruction={instruction}
              defaultExpanded
            />
            <SectionIntro
              title="Finalize"
              description="Writes the draft into envs/figma-design/tasks/ and runs Harbor-ready scaffolding."
            />
          </>
        )}
        </div>
      </div>

      <footer className="p-2 border-t border-[#333] flex gap-2 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          disabled={stepIndex <= 0 || busy}
          onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)]!)}
        >
          Back
        </Button>
        {step === 'name' && (
          <Button size="sm" variant="primary" className="flex-1" disabled={busy} onClick={() => void createTask()}>
            Create & continue
          </Button>
        )}
        {step !== 'name' && step !== 'review' && step !== 'export' && (
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            disabled={busy}
            onClick={() => void saveAndNext(STEPS[stepIndex + 1]!)}
          >
            Save & next
          </Button>
        )}
        {step === 'export' && task?.exportCompleted && (
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            disabled={busy}
            onClick={() => void saveAndNext('gates')}
          >
            Continue to gates
          </Button>
        )}
        {step === 'review' && (
          <Button size="sm" variant="primary" className="flex-1" disabled={busy} onClick={() => void complete()}>
            Complete task
          </Button>
        )}
      </footer>
    </div>
  );
}
