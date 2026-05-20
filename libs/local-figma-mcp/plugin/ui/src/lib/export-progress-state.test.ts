import { describe, expect, it } from 'vitest';
import {
  applyExportProgressSnapshot,
  applyFinalizeProgress,
  createInitialExportProgress,
  type ExportProgressSnapshot,
} from './export-progress-state';

function sampleSnapshot(overrides: Partial<ExportProgressSnapshot> = {}): ExportProgressSnapshot {
  return {
    active: 'serialize',
    activeDetail: 'Serializing nodes',
    tracks: {
      meta: { done: true },
      nodes: { serialized: 100, total: 0 },
      icons: { exported: 0, total: 0, uniqueAssets: 0 },
      images: { fetched: 0, uploaded: 0, total: 0 },
      upload: {
        treeBatchesPosted: 0,
        treeBatchesAcked: 0,
        iconPropsBatchesPosted: 0,
        iconPropsBatchesAcked: 0,
        rasterAssetsPosted: 0,
        rasterAssetsAcked: 0,
        httpPartsUploaded: 0,
      },
    },
    timing: {
      elapsedMs: 1000,
      metaMs: 100,
      serializeMs: 800,
      iconsMs: 0,
      imagesFetchMs: 0,
      imagesUploadMs: 0,
      uploadWaitMs: 0,
      nodesPerSec: 100,
      nodesSerialized: 100,
      uploadInflight: 0,
    },
    ...overrides,
  };
}

describe('applyExportProgressSnapshot', () => {
  it('shows images total once session totals are known', () => {
    const snap = sampleSnapshot({
      active: 'images',
      tracks: {
        meta: { done: true },
        nodes: { serialized: 500, total: 500 },
        icons: { exported: 10, total: 10, uniqueAssets: 3 },
        images: { fetched: 50, uploaded: 40, total: 200 },
        upload: {
          treeBatchesPosted: 10,
          treeBatchesAcked: 10,
          iconPropsBatchesPosted: 1,
          iconPropsBatchesAcked: 1,
          rasterAssetsPosted: 40,
          rasterAssetsAcked: 35,
          httpPartsUploaded: 50,
        },
      },
    });
    const p = applyExportProgressSnapshot(null, snap);
    expect(p.tracks.images.total).toBe(200);
    expect(p.tracks.images.current).toBe(40);
    expect(p.tracks.images.status).toBe('running');
    expect(p.active).toBe('images');
  });

  it('never marks images done while uploaded is below total', () => {
    const snap = sampleSnapshot({
      active: 'upload_images',
      tracks: {
        meta: { done: true },
        nodes: { serialized: 100, total: 100 },
        icons: { exported: 5, total: 5, uniqueAssets: 2 },
        images: { fetched: 10, uploaded: 8, total: 10 },
        upload: {
          treeBatchesPosted: 2,
          treeBatchesAcked: 2,
          iconPropsBatchesPosted: 1,
          iconPropsBatchesAcked: 1,
          rasterAssetsPosted: 8,
          rasterAssetsAcked: 6,
          httpPartsUploaded: 20,
        },
      },
    });
    const p = applyExportProgressSnapshot(null, snap);
    expect(p.tracks.images.status).toBe('running');
    expect(p.tracks.uploadImages.status).toBe('running');
  });

  it('preserves finalize track when applying plugin snapshots', () => {
    let p = createInitialExportProgress();
    p = applyFinalizeProgress(p, 0, 1, 'Saving…');
    const snap = sampleSnapshot({ active: 'upload_tree' });
    p = applyExportProgressSnapshot(p, snap);
    expect(p.tracks.finalize.status).toBe('running');
    expect(p.tracks.finalize.detail).toBe('Saving…');
  });
});
