import {
  applySessionTotals,
  buildExportProgressSnapshot,
  createInitialReporterState,
  type ExportProgressReporterState,
  type ExportProgressSnapshot,
} from './exportProgressSnapshot.js';
import type { ExportMetricsCollector } from './exportMetrics.js';
import type { ExportUploadGate } from './exportUploadGate.js';
import type { ExportTotals, IconUploadStats } from './streamProtocol.js';

const EMIT_INTERVAL_MS = 400;

export class ExportProgressReporter {
  readonly state: ExportProgressReporterState = createInitialReporterState();
  private lastEmitMs = 0;

  constructor(
    private readonly metrics: ExportMetricsCollector,
    private readonly gate: ExportUploadGate,
    private readonly postSnapshot: (snapshot: ExportProgressSnapshot) => void
  ) {}

  onSessionTotals(totals: ExportTotals): void {
    applySessionTotals(this.state, totals);
    this.emit(true);
  }

  onMetaDone(): void {
    this.state.metaDone = true;
    this.emit(true);
  }

  onSerializeProgress(serialized: number): void {
    this.state.nodesSerialized = serialized;
    this.emit();
  }

  onSerializeComplete(serialized: number): void {
    this.state.nodesSerialized = serialized;
    this.emit(true);
  }

  onIconsProgress(exported: number): void {
    this.state.iconsExported = exported;
    this.emit();
  }

  onIconPhaseComplete(stats: IconUploadStats): void {
    this.state.iconsExported = stats.iconRoots;
    this.state.iconUniqueAssets = stats.uniqueIconAssets;
    this.state.iconsPhaseComplete = true;
    this.emit(true);
  }

  onImagesProgress(fetched: number, uploaded: number): void {
    this.state.imagesFetched = fetched;
    this.state.imagesUploaded = uploaded;
    this.emit();
  }

  onExportComplete(): void {
    this.state.exportComplete = true;
    this.emit(true);
  }

  emit(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastEmitMs < EMIT_INTERVAL_MS) return;
    this.lastEmitMs = now;
    this.postSnapshot(buildExportProgressSnapshot(this.state, this.gate, this.metrics));
  }

  buildSnapshot(httpPartsUploaded?: number): ExportProgressSnapshot {
    return buildExportProgressSnapshot(this.state, this.gate, this.metrics, httpPartsUploaded);
  }
}
