import type { ExportProgressTiming } from './export-metrics';

export type ExportActivePhase =
  | 'meta'
  | 'serialize'
  | 'icons'
  | 'images'
  | 'upload_tree'
  | 'upload_icons'
  | 'upload_images'
  | 'finalize'
  | 'idle';

export interface ExportProgressTracks {
  meta: { done: boolean };
  nodes: { serialized: number; total: number };
  icons: { exported: number; total: number; uniqueAssets: number };
  images: { fetched: number; uploaded: number; total: number };
  upload: {
    treeBatchesPosted: number;
    treeBatchesAcked: number;
    iconPropsBatchesPosted: number;
    iconPropsBatchesAcked: number;
    rasterAssetsPosted: number;
    rasterAssetsAcked: number;
    httpPartsUploaded: number;
  };
}

export interface ExportProgressSnapshot {
  active: ExportActivePhase;
  activeDetail?: string;
  tracks: ExportProgressTracks;
  timing: ExportProgressTiming;
}

export type PhaseStatus = 'pending' | 'running' | 'done' | 'skipped';

export interface TrackProgress {
  status: PhaseStatus;
  current: number;
  total: number;
  percent: number;
  detail?: string;
}

export interface MultiPhaseExportProgress {
  active: ExportActivePhase;
  activeDetail?: string;
  tracks: {
    meta: TrackProgress;
    nodes: TrackProgress;
    icons: TrackProgress;
    images: TrackProgress;
    uploadTree: TrackProgress;
    uploadIcons: TrackProgress;
    uploadImages: TrackProgress;
    finalize: TrackProgress;
  };
  timing?: ExportProgressTiming;
}

export type ExportOutcome =
  | { kind: 'success'; title: string; message: string }
  | { kind: 'error'; title: string; message: string };

function defaultTrack(status: PhaseStatus = 'pending'): TrackProgress {
  return { status, current: 0, total: 0, percent: 0 };
}

function trackPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((100 * Math.min(current, total)) / total));
}

export function createInitialExportProgress(): MultiPhaseExportProgress {
  return {
    active: 'meta',
    tracks: {
      meta: defaultTrack('running'),
      nodes: defaultTrack(),
      icons: defaultTrack(),
      images: defaultTrack(),
      uploadTree: defaultTrack(),
      uploadIcons: defaultTrack(),
      uploadImages: defaultTrack(),
      finalize: defaultTrack(),
    },
    timing: undefined,
  };
}

function trackStatus(
  current: number,
  total: number,
  active: boolean,
  skipped = false
): PhaseStatus {
  if (skipped) return 'skipped';
  if (total > 0 && current >= total) return 'done';
  if (active) return 'running';
  if (current > 0) return 'running';
  return 'pending';
}

export function applyExportProgressSnapshot(
  prev: MultiPhaseExportProgress | null,
  snapshot: ExportProgressSnapshot
): MultiPhaseExportProgress {
  const base = prev ?? createInitialExportProgress();
  const t = snapshot.tracks;
  const active = snapshot.active;

  const nodesTotal = t.nodes.total;
  const iconsTotal = t.icons.total;
  const imagesTotal = t.images.total;

  const metaSkipped = false;
  const iconsSkipped = iconsTotal === 0 && t.icons.exported === 0;
  const imagesSkipped = imagesTotal === 0;

  const uploadTreeTotal = t.upload.treeBatchesPosted;
  const uploadIconsTotal = t.upload.iconPropsBatchesPosted;
  const uploadImagesTotal = t.upload.rasterAssetsPosted;

  return {
    active,
    activeDetail: snapshot.activeDetail,
    timing: snapshot.timing,
    tracks: {
      meta: {
        status: t.meta.done ? 'done' : trackStatus(0, 1, active === 'meta', metaSkipped),
        current: t.meta.done ? 1 : 0,
        total: 1,
        percent: t.meta.done ? 100 : 0,
      },
      nodes: {
        status: trackStatus(
          t.nodes.serialized,
          nodesTotal,
          active === 'serialize',
          nodesTotal === 0
        ),
        current: t.nodes.serialized,
        total: nodesTotal,
        percent: trackPercent(t.nodes.serialized, nodesTotal),
        detail:
          nodesTotal === 0 && t.nodes.serialized > 0
            ? `${t.nodes.serialized.toLocaleString()} nodes`
            : undefined,
      },
      icons: {
        status: trackStatus(
          t.icons.exported,
          iconsTotal,
          active === 'icons',
          iconsSkipped
        ),
        current: t.icons.exported,
        total: iconsTotal,
        percent: trackPercent(t.icons.exported, iconsTotal),
        detail:
          t.icons.uniqueAssets > 0
            ? `${t.icons.uniqueAssets.toLocaleString()} unique assets`
            : undefined,
      },
      images: {
        status: trackStatus(
          t.images.uploaded,
          imagesTotal,
          active === 'images' || active === 'upload_images',
          imagesSkipped
        ),
        current: t.images.uploaded,
        total: imagesTotal,
        percent: trackPercent(t.images.uploaded, imagesTotal),
        detail:
          imagesTotal > 0
            ? `${t.images.fetched.toLocaleString()} fetched`
            : undefined,
      },
      uploadTree: {
        status: trackStatus(
          t.upload.treeBatchesAcked,
          uploadTreeTotal,
          active === 'upload_tree'
        ),
        current: t.upload.treeBatchesAcked,
        total: uploadTreeTotal,
        percent: trackPercent(t.upload.treeBatchesAcked, uploadTreeTotal),
      },
      uploadIcons: {
        status: trackStatus(
          t.upload.iconPropsBatchesAcked,
          uploadIconsTotal,
          active === 'upload_icons'
        ),
        current: t.upload.iconPropsBatchesAcked,
        total: uploadIconsTotal,
        percent: trackPercent(t.upload.iconPropsBatchesAcked, uploadIconsTotal),
      },
      uploadImages: {
        status: trackStatus(
          t.upload.rasterAssetsAcked,
          uploadImagesTotal,
          active === 'upload_images'
        ),
        current: t.upload.rasterAssetsAcked,
        total: uploadImagesTotal,
        percent: trackPercent(t.upload.rasterAssetsAcked, uploadImagesTotal),
        detail:
          t.upload.httpPartsUploaded > 0
            ? `${t.upload.httpPartsUploaded.toLocaleString()} HTTP parts`
            : undefined,
      },
      finalize: {
        ...base.tracks.finalize,
        status:
          active === 'finalize'
            ? 'running'
            : base.tracks.finalize.status === 'done'
              ? 'done'
              : 'pending',
      },
    },
  };
}

export function applyFinalizeProgress(
  prev: MultiPhaseExportProgress,
  current: number,
  total: number,
  detail?: string
): MultiPhaseExportProgress {
  return {
    ...prev,
    active: 'finalize',
    tracks: {
      ...prev.tracks,
      finalize: {
        status: current >= total && total > 0 ? 'done' : 'running',
        current,
        total,
        percent: trackPercent(current, total),
        detail,
      },
    },
  };
}

export function markAllTracksDone(progress: MultiPhaseExportProgress): MultiPhaseExportProgress {
  const tracks = { ...progress.tracks };
  for (const key of Object.keys(tracks) as (keyof typeof tracks)[]) {
    const p = tracks[key];
    if (p.status === 'skipped') continue;
    tracks[key] = {
      ...p,
      status: 'done',
      percent: 100,
      current: p.total > 0 ? p.total : 1,
      total: p.total > 0 ? p.total : 1,
    };
  }
  return { ...progress, active: 'idle', tracks };
}
