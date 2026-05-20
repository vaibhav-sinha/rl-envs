import { useState } from 'react';
import {
  applyExportProgressSnapshot,
  applyFinalizeProgress,
  createInitialExportProgress,
  exportSnapshotStreaming,
  finishExportStreamSession,
} from '../lib/plugin-bridge';
import type { ExportOutcome, MultiPhaseExportProgress } from '../lib/export-progress-state';
import { ExportOutcomeBanner, ExportProgressPanel } from '../components/ExportProgress';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export function ExportTab({
  onLog,
  defaultFileName,
}: {
  onLog: (t: string, e?: boolean) => void;
  defaultFileName: string;
}) {
  const [fileName, setFileName] = useState(defaultFileName);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<MultiPhaseExportProgress | null>(null);
  const [outcome, setOutcome] = useState<ExportOutcome | null>(null);

  const reportProgress = (snapshot: Parameters<typeof applyExportProgressSnapshot>[1]) => {
    setProgress((prev) => applyExportProgressSnapshot(prev, snapshot));
  };

  const runExport = async () => {
    const name = fileName.trim() || defaultFileName;
    setBusy(true);
    setProgress(createInitialExportProgress());
    setOutcome(null);
    onLog('Starting streaming export…');
    try {
      const { exportId } = await exportSnapshotStreaming(name, {
        onProgress: reportProgress,
      });

      setProgress((prev) =>
        prev ? applyFinalizeProgress(prev, 0, 1, 'Importing on Task Builder…') : prev
      );
      onLog('Finalizing on Task Builder…');
      const result = await finishExportStreamSession(exportId, {
        standaloneFileName: name,
      });
      setProgress((prev) => (prev ? applyFinalizeProgress(prev, 1, 1) : prev));

      const path = result.filePath ?? `${name}.hfc.json`;
      setOutcome({
        kind: 'success',
        title: 'Export complete',
        message: `Saved to ${path}`,
      });
      onLog(`Saved: ${path}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setOutcome({
        kind: 'error',
        title: 'Export failed',
        message,
      });
      onLog(message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[11px] text-muted m-0">
        Export the current Figma file to HFC workspace via Task Builder (port 3856). Large files stream
        incrementally to avoid memory limits.
      </p>
      <div>
        <Label htmlFor="export-name">File name</Label>
        <Input id="export-name" value={fileName} onChange={(e) => setFileName(e.target.value)} className="mt-1" />
      </div>
      {busy && progress ? <ExportProgressPanel progress={progress} /> : null}
      {outcome ? <ExportOutcomeBanner outcome={outcome} onDismiss={() => setOutcome(null)} /> : null}
      <Button variant="primary" disabled={busy} onClick={() => void runExport()}>
        {busy ? 'Exporting…' : 'Export File'}
      </Button>
    </div>
  );
}
