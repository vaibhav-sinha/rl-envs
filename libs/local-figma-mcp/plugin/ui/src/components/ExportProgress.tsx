import {
  EXPORT_PHASE_LABEL,
  EXPORT_PHASE_ORDER,
  type ExportOutcome,
  type MultiPhaseExportProgress,
} from '../lib/export-progress-state';

function phaseStatusIcon(status: MultiPhaseExportProgress['phases'][keyof MultiPhaseExportProgress['phases']]['status']) {
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

export function ExportProgressPanel({ progress }: { progress: MultiPhaseExportProgress | null }) {
  if (!progress) return null;

  return (
    <div className="rounded-md border border-[#444] bg-[#252525] p-2.5 space-y-2">
      <p className="text-[10px] font-medium text-foreground m-0">Export progress</p>
      <ul className="m-0 p-0 list-none space-y-2">
        {EXPORT_PHASE_ORDER.map((id) => {
          const phase = progress.phases[id];
          const label = EXPORT_PHASE_LABEL[id];
          const isRunning = phase.status === 'running';
          const showBar = isRunning && phase.total > 0;

          return (
            <li key={id} className="space-y-1">
              <div className="flex items-center gap-2 text-[11px]">
                {phaseStatusIcon(phase.status)}
                <span className={isRunning ? 'text-foreground font-medium' : 'text-muted'}>{label}</span>
                {phase.status === 'skipped' ? (
                  <span className="text-muted ml-auto text-[10px]">skipped</span>
                ) : isRunning || phase.status === 'done' ? (
                  <span className="text-muted ml-auto text-[10px] tabular-nums">
                    {phase.total > 0 ? (
                      <>
                        {phase.current} / {phase.total}
                        {isRunning ? ` (${phase.percent}%)` : ''}
                      </>
                    ) : phase.detail ? (
                      phase.detail
                    ) : null}
                  </span>
                ) : null}
              </div>
              {showBar ? (
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden ml-5">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${phase.percent}%` }}
                  />
                </div>
              ) : null}
              {isRunning && phase.detail && phase.total > 0 ? (
                <p className="text-[10px] text-muted m-0 ml-5">{phase.detail}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ExportOutcomeBanner({
  outcome,
  onDismiss,
}: {
  outcome: ExportOutcome;
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
