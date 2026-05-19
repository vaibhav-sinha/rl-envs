import type { ExportProgressPhase } from '../lib/plugin-bridge';

const PHASE_LABEL: Record<ExportProgressPhase, string> = {
  count: 'Counting',
  serialize: 'Serializing nodes',
  icons: 'Exporting icons',
  images: 'Exporting images',
  upload: 'Uploading',
};

export function ExportProgressBar({
  progress,
}: {
  progress: {
    phase: ExportProgressPhase;
    current: number;
    total: number;
    percent: number;
    detail?: string;
  } | null;
}) {
  if (!progress) return null;
  const label = PHASE_LABEL[progress.phase] ?? progress.phase;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[11px] text-muted">
        <span>
          {label}
          {progress.detail ? ` — ${progress.detail}` : ''}
        </span>
        <span>
          {progress.current} / {progress.total} ({progress.percent}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
