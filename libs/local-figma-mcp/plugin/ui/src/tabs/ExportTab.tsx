import { useState } from 'react';
import { taskBuilderApi } from '../api/taskBuilder';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { exportSnapshot } from '../lib/plugin-bridge';

export function ExportTab({
  onLog,
  defaultFileName,
}: {
  onLog: (t: string, e?: boolean) => void;
  defaultFileName: string;
}) {
  const [fileName, setFileName] = useState(defaultFileName);
  const [busy, setBusy] = useState(false);

  const runExport = async () => {
    const name = fileName.trim() || defaultFileName;
    setBusy(true);
    onLog('Reading document…');
    try {
      const snapshot = await exportSnapshot(name);
      onLog('Uploading via Task Builder…');
      const result = await taskBuilderApi.standaloneExport(name, snapshot);
      onLog(`Saved: ${result.filePath}`);
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[11px] text-muted m-0">
        Export the current Figma file to HFC workspace via Task Builder (port 3856).
      </p>
      <div>
        <Label htmlFor="export-name">File name</Label>
        <Input id="export-name" value={fileName} onChange={(e) => setFileName(e.target.value)} className="mt-1" />
      </div>
      <Button variant="primary" disabled={busy} onClick={() => void runExport()}>
        {busy ? 'Exporting…' : 'Export File'}
      </Button>
    </div>
  );
}
