import {
  formatCount,
  formatDurationMs,
  type ExportProgressTiming,
} from '../lib/export-metrics';
import type { MultiPhaseExportProgress, TrackProgress } from '../lib/export-progress-state';

function trackStatusIcon(status: TrackProgress['status']) {
  switch (status) {
    case 'done':
      return <span className="text-accent shrink-0">✓</span>;
    case 'skipped':
      return <span className="text-muted shrink-0">—</span>;
    case 'running':
      return <span className="text-primary shrink-0 animate-pulse">●</span>;
    default:
      return <span className="text-muted/50 shrink-0">○</span>;
  }
}

function TrackRow({
  label,
  track,
}: {
  label: string;
  track: TrackProgress;
}) {
  const isRunning = track.status === 'running';
  const showBar = isRunning && track.total > 0;

  return (
    <li className="space-y-1">
      <div className="flex items-center gap-2 text-[11px]">
        {trackStatusIcon(track.status)}
        <span className={isRunning ? 'text-foreground font-medium' : 'text-muted'}>{label}</span>
        {track.status === 'skipped' ? (
          <span className="text-muted ml-auto text-[10px]">skipped</span>
        ) : isRunning || track.status === 'done' ? (
          <span className="text-muted ml-auto text-[10px] tabular-nums">
            {track.total > 0 ? (
              <>
                {formatCount(track.current)} / {formatCount(track.total)}
                {isRunning ? ` (${track.percent}%)` : ''}
              </>
            ) : track.detail ? (
              track.detail
            ) : track.current > 0 ? (
              formatCount(track.current)
            ) : null}
          </span>
        ) : null}
      </div>
      {showBar ? (
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden ml-5">
          <div
            className="h-full bg-primary transition-all duration-200"
            style={{ width: `${track.percent}%` }}
          />
        </div>
      ) : null}
      {isRunning && track.detail && track.total > 0 ? (
        <p className="text-[10px] text-muted m-0 ml-5">{track.detail}</p>
      ) : null}
    </li>
  );
}

function ExportTimingPanel({ timing }: { timing: ExportProgressTiming }) {
  return (
    <div className="rounded border border-[#3a3a3a] bg-[#1e1e1e] p-2 space-y-1">
      <p className="text-[10px] font-medium text-muted m-0">Timing</p>
      <p className="text-[10px] text-muted m-0 tabular-nums">
        Elapsed {formatDurationMs(timing.elapsedMs)}
      </p>
      <p className="text-[10px] text-muted m-0 tabular-nums">
        Serialize {formatDurationMs(timing.serializeMs)}
        {timing.nodesPerSec > 0 ? ` · ${formatCount(timing.nodesPerSec)} nodes/s` : ''}
        {timing.nodesSerialized > 0 ? ` · ${formatCount(timing.nodesSerialized)} nodes` : ''}
      </p>
      <p className="text-[10px] text-muted m-0 tabular-nums">
        Upload wait (main) {formatDurationMs(timing.uploadWaitMs)}
        {timing.uploadInflight > 0 ? ` · ${timing.uploadInflight} in flight` : ''}
      </p>
      {timing.httpUploadMs !== undefined && timing.httpUploadMs > 0 ? (
        <p className="text-[10px] text-muted m-0 tabular-nums">
          HTTP upload (UI) {formatDurationMs(timing.httpUploadMs)}
        </p>
      ) : null}
      {timing.metaMs > 0 || timing.iconsMs > 0 || timing.imagesFetchMs > 0 ? (
        <p className="text-[10px] text-muted m-0 tabular-nums">
          {timing.metaMs > 0 ? `Meta ${formatDurationMs(timing.metaMs)}` : ''}
          {timing.iconsMs > 0 ? `${timing.metaMs > 0 ? ' · ' : ''}Icons ${formatDurationMs(timing.iconsMs)}` : ''}
          {timing.imagesFetchMs > 0
            ? `${timing.metaMs > 0 || timing.iconsMs > 0 ? ' · ' : ''}Images fetch ${formatDurationMs(timing.imagesFetchMs)}`
            : ''}
          {timing.imagesUploadMs > 0
            ? ` · Images upload ${formatDurationMs(timing.imagesUploadMs)}`
            : ''}
        </p>
      ) : null}
    </div>
  );
}

export function ExportProgressPanel({ progress }: { progress: MultiPhaseExportProgress | null }) {
  if (!progress) return null;

  const { tracks } = progress;

  return (
    <div className="rounded-md border border-[#444] bg-[#252525] p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-foreground m-0">Export progress</p>
      {progress.activeDetail ? (
        <p className="text-[11px] text-primary m-0 font-medium">{progress.activeDetail}</p>
      ) : null}
      {progress.timing ? <ExportTimingPanel timing={progress.timing} /> : null}
      <ul className="m-0 p-0 list-none space-y-2">
        <TrackRow label="Metadata" track={tracks.meta} />
        <TrackRow label="Nodes" track={tracks.nodes} />
        <TrackRow label="Icons" track={tracks.icons} />
        <TrackRow label="Images" track={tracks.images} />
        <TrackRow label="Tree upload" track={tracks.uploadTree} />
        <TrackRow label="Icon data upload" track={tracks.uploadIcons} />
        <TrackRow label="Image asset upload" track={tracks.uploadImages} />
        <TrackRow label="Finalize" track={tracks.finalize} />
      </ul>
    </div>
  );
}

export function ExportOutcomeBanner({
  outcome,
  onDismiss,
}: {
  outcome: import('../lib/export-progress-state').ExportOutcome;
  onDismiss?: () => void;
}) {
  const isSuccess = outcome.kind === 'success';
  return (
    <div
      className={`rounded-md border p-2.5 space-y-1 ${
        isSuccess
          ? 'border-accent/40 bg-accent/10'
          : 'border-destructive/40 bg-destructive/10'
      }`}
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className={`text-[11px] font-medium m-0 ${isSuccess ? 'text-accent' : 'text-destructive'}`}
          >
            {isSuccess ? '✓ ' : '✗ '}
            {outcome.title}
          </p>
          <p className="text-[10px] text-muted m-0 mt-1 break-all">{outcome.message}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            className="text-muted hover:text-foreground text-[10px] shrink-0"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
