import { useEffect, useState } from 'react';
import {
  applyExportProgressSnapshot,
  applyFinalizeProgress,
  createInitialExportProgress,
  exportSnapshotStreaming,
  finishExportStreamSession,
  listReadyExportSessions,
  pickNodeId,
  replayFinishExportStreamSession,
  type PendingExportSession,
} from '../lib/plugin-bridge';
import type { ExportOutcome, MultiPhaseExportProgress } from '../lib/export-progress-state';
import { ExportOutcomeBanner, ExportProgressPanel } from '../components/ExportProgress';
import { PageMultiSelect } from '../components/PageMultiSelect';
import { useFilePages } from '../hooks/useFilePages';
import { logExportError } from '../../../src/exportError.js';
import { taskBuilderApi, type DesignListItem } from '../api/taskBuilder';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

function slugifyDesignName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ExportTab({
  onLog,
  defaultFileName,
}: {
  onLog: (t: string, e?: boolean) => void;
  defaultFileName: string;
}) {
  const [exportMode, setExportMode] = useState<'new' | 're'>('new');
  const [fileName, setFileName] = useState(defaultFileName);
  const [reexportTarget, setReexportTarget] = useState<string | null>(null);
  const [designs, setDesigns] = useState<DesignListItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<MultiPhaseExportProgress | null>(null);
  const [outcome, setOutcome] = useState<ExportOutcome | null>(null);
  const [pendingExportId, setPendingExportId] = useState<string | null>(null);
  const [readySessions, setReadySessions] = useState<PendingExportSession[]>([]);
  const [pickedNodeId, setPickedNodeId] = useState<string | null>(null);
  const [nodeIdError, setNodeIdError] = useState<string | null>(null);
  const filePages = useFilePages();

  const reportProgress = (snapshot: Parameters<typeof applyExportProgressSnapshot>[1]) => {
    setProgress((prev) => applyExportProgressSnapshot(prev, snapshot));
  };

  const refreshDesigns = async () => {
    try {
      const body = await taskBuilderApi.listDesigns();
      setDesigns(body.designs);
      if (body.designs.length > 0 && !reexportTarget) {
        setReexportTarget(body.designs[0]!.name);
      }
    } catch {
      setDesigns([]);
    }
  };

  const refreshReadySessions = async () => {
    try {
      const sessions = await listReadyExportSessions();
      setReadySessions(sessions);
    } catch {
      setReadySessions([]);
    }
  };

  useEffect(() => {
    void refreshDesigns();
    void refreshReadySessions();
  }, []);

  const runFinalize = async (
    exportId: string,
    name: string,
    replay: boolean
  ): Promise<void> => {
    setProgress((prev) =>
      prev ? applyFinalizeProgress(prev, 0, 1, 'Importing on Task Builder…') : createInitialExportProgress()
    );
    onLog(replay ? 'Replaying finalize from disk…' : 'Finalizing on Task Builder…');
    const finish = replay ? replayFinishExportStreamSession : finishExportStreamSession;
    const result = await finish(exportId, {
      standaloneFileName: name,
      exportMode,
      reexportTarget: exportMode === 're' ? reexportTarget ?? undefined : undefined,
      ...(replay ? { source: 'disk' as const } : {}),
    });
    setProgress((prev) => (prev ? applyFinalizeProgress(prev, 1, 1) : prev));
    const path = result.filePath ?? `designs/${slugifyDesignName(name)}/design.hfc.json`;
    setOutcome({
      kind: 'success',
      title: 'Export complete',
      message: `Saved to ${path}`,
    });
    setPendingExportId(null);
    onLog(`Saved: ${path}`);
    void refreshDesigns();
    void refreshReadySessions();
  };

  const runExport = async () => {
    const name =
      exportMode === 're'
        ? (reexportTarget ?? '').trim()
        : slugifyDesignName(fileName.trim() || defaultFileName);
    if (!name) {
      onLog(exportMode === 're' ? 'Select an export to overwrite' : 'Enter an export name', true);
      return;
    }
    setBusy(true);
    setProgress(createInitialExportProgress());
    setOutcome(null);
    setPendingExportId(null);
    onLog('Starting streaming export…');
    try {
      const { exportId } = await exportSnapshotStreaming(name, {
        includePageIds: [...filePages.selectedPageIds],
        onProgress: reportProgress,
      });

      try {
        await runFinalize(exportId, name, false);
      } catch (finalizeError) {
        setPendingExportId(exportId);
        throw finalizeError;
      }
    } catch (e) {
      const message = logExportError(
        pendingExportId ? 'ui/ExportTab/finalize' : 'ui/ExportTab/export',
        e
      );
      setOutcome({
        kind: 'error',
        title: pendingExportId ? 'Finalize failed' : 'Export failed',
        message,
      });
      onLog(message, true);
      void refreshReadySessions();
    } finally {
      setBusy(false);
    }
  };

  const handleGetNodeId = async () => {
    setNodeIdError(null);
    setPickedNodeId(null);
    try {
      const nodeId = await pickNodeId();
      setPickedNodeId(nodeId);
      try {
        await navigator.clipboard.writeText(nodeId);
        onLog(`Node ID: ${nodeId} (copied to clipboard)`);
      } catch {
        onLog(`Node ID: ${nodeId}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setNodeIdError(message);
      onLog(message, true);
    }
  };

  const retryFinalize = async (exportId: string, sessionName: string) => {
    setBusy(true);
    setOutcome(null);
    try {
      await runFinalize(exportId, sessionName, true);
    } catch (e) {
      const message = logExportError('ui/ExportTab/retryFinalize', e);
      setOutcome({
        kind: 'error',
        title: 'Finalize failed',
        message,
      });
      onLog(message, true);
    } finally {
      setBusy(false);
    }
  };

  const exportLabel =
    exportMode === 're'
      ? busy
        ? 'Re-exporting…'
        : 'Re-export'
      : busy
        ? 'Exporting…'
        : 'Export File';

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[11px] text-muted m-0">
        Export the current Figma file to the shared designs library via Task Builder. Only selected
        pages are streamed. Large files stream incrementally to avoid memory limits.
      </p>
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
      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-muted m-0 font-medium">Export mode</p>
        <div className="flex gap-2">
          <Button
            variant={exportMode === 'new' ? 'primary' : 'default'}
            disabled={busy}
            onClick={() => setExportMode('new')}
          >
            New export
          </Button>
          <Button
            variant={exportMode === 're' ? 'primary' : 'default'}
            disabled={busy}
            onClick={() => setExportMode('re')}
          >
            Re-export
          </Button>
        </div>
      </div>
      {exportMode === 'new' ? (
        <div>
          <Label htmlFor="export-name">Export name</Label>
          <Input
            id="export-name"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="mt-1"
          />
          <p className="text-[10px] text-muted mt-1 m-0">
            Saved under designs/{slugifyDesignName(fileName.trim() || defaultFileName) || '…'}/
          </p>
        </div>
      ) : (
        <div>
          <Label htmlFor="reexport-target">Existing export</Label>
          {designs.length === 0 ? (
            <p className="text-[10px] text-muted mt-1 m-0">No exports found in designs library.</p>
          ) : (
            <select
              id="reexport-target"
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-[11px]"
              value={reexportTarget ?? ''}
              disabled={busy}
              onChange={(e) => setReexportTarget(e.target.value)}
            >
              {designs.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {busy && progress ? <ExportProgressPanel progress={progress} /> : null}
      {outcome ? <ExportOutcomeBanner outcome={outcome} onDismiss={() => setOutcome(null)} /> : null}
      {pendingExportId ? (
        <div className="flex flex-col gap-2 p-2 border border-border rounded">
          <p className="text-[10px] text-muted m-0">
            Stream upload finished; finalize failed. You can retry without re-exporting from Figma.
          </p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void retryFinalize(
                pendingExportId,
                exportMode === 're'
                  ? (reexportTarget ?? '')
                  : slugifyDesignName(fileName.trim() || defaultFileName)
              )
            }
          >
            Retry finalize
          </Button>
        </div>
      ) : null}
      {readySessions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-muted m-0 font-medium">Sessions ready to finalize</p>
          {readySessions.map((s) => (
            <div
              key={s.exportId}
              className="flex flex-col gap-1 p-2 border border-border rounded text-[10px]"
            >
              <span className="text-foreground">{s.figmaFileName || s.hfcFileName}</span>
              <span className="text-muted font-mono truncate">{s.exportId}</span>
              {s.lastError ? <span className="text-destructive">{s.lastError}</span> : null}
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void retryFinalize(s.exportId, s.hfcFileName || s.figmaFileName || defaultFileName)
                }
              >
                Finalize from disk
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <Button
        variant="primary"
        disabled={
          busy ||
          !filePages.hasSelection ||
          filePages.loading ||
          (exportMode === 're' && (designs.length === 0 || !reexportTarget))
        }
        onClick={() => void runExport()}
      >
        {exportLabel}
      </Button>

      <hr className="border-0 border-t border-border my-1" />

      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-muted m-0 font-medium">Node ID</p>
        <p className="text-[11px] text-muted m-0">
          Select exactly one layer in Figma, then copy its node ID for use in eval specs or scripts.
        </p>
        {pickedNodeId ? (
          <div className="flex flex-col gap-1 p-2 border border-border rounded">
            <span className="text-[10px] text-muted">Selected node ID</span>
            <span className="text-[10px] font-mono text-foreground break-all">{pickedNodeId}</span>
          </div>
        ) : null}
        {nodeIdError ? <p className="text-[10px] text-destructive m-0">{nodeIdError}</p> : null}
        <Button variant="default" disabled={busy} onClick={() => void handleGetNodeId()}>
          Get Node ID
        </Button>
      </div>
    </div>
  );
}
