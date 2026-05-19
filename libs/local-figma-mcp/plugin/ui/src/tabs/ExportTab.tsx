import { useState } from 'react';
import {
  exportSnapshotStreaming,
  finishExportStreamSession,
  type ExportProgressState,
} from '../lib/plugin-bridge';
import { ExportProgressBar } from '../components/ExportProgress';
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
  const [progress, setProgress] = useState<ExportProgressState | null>(null);

  const runExport = async () => {
    const name = fileName.trim() || defaultFileName;
    setBusy(true);
    setProgress(null);
    onLog('Starting streaming export…');
    try {
      const { exportId } = await exportSnapshotStreaming(name, {
        onProgress: setProgress,
      });
      onLog('Finalizing on Task Builder…');
      const result = await finishExportStreamSession(exportId, {
        standaloneFileName: name,
      });
      onLog(`Saved: ${result.filePath ?? 'ok'}`);
      setProgress({ phase: 'upload', current: 1, total: 1, percent: 100 });
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
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
      {busy && <ExportProgressBar progress={progress} />}
      <Button variant="primary" disabled={busy} onClick={() => void runExport()}>
        {busy ? 'Exporting…' : 'Export File'}
      </Button>
    </div>
  );
}
