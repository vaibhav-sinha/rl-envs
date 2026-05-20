import { describe, expect, it } from 'vitest';
import { applyExportProgressUpdate, createInitialExportProgress } from './export-progress-state';

describe('applyExportProgressUpdate', () => {
  it('does not mark pending icons/images as skipped when upload starts during serialize', () => {
    let p = createInitialExportProgress();
    p = applyExportProgressUpdate(p, { phase: 'meta', current: 1, total: 1, percent: 100 });
    p = applyExportProgressUpdate(p, {
      phase: 'serialize',
      current: 100,
      total: 0,
      percent: 0,
    });
    p = applyExportProgressUpdate(p, {
      phase: 'upload',
      current: 500,
      total: 78000,
      percent: 1,
    });

    expect(p.phases.icons.status).toBe('pending');
    expect(p.phases.images.status).toBe('pending');
    expect(p.phases.upload.status).toBe('running');
    expect(p.phases.serialize.status).toBe('running');
  });

  it('marks icons skipped only on explicit zero-total zero-current update', () => {
    let p = createInitialExportProgress();
    p = applyExportProgressUpdate(p, { phase: 'icons', current: 0, total: 0, percent: 100 });
    expect(p.phases.icons.status).toBe('skipped');
  });

  it('stores metrics snapshot when provided', () => {
    let p = createInitialExportProgress();
    p = applyExportProgressUpdate(p, {
      phase: 'serialize',
      current: 1000,
      total: 0,
      percent: 0,
      metrics: {
        elapsedMs: 5000,
        phase: 'serialize',
        serializeMs: 4000,
        uploadWaitMs: 100,
        metaMs: 200,
        iconsMs: 0,
        imagesMs: 0,
        nodesSerialized: 1000,
        treeBatchesPosted: 4,
        treeBatchesAcked: 3,
        uploadInflight: 1,
        nodesPerSec: 250,
      },
    });
    expect(p.metrics?.nodesSerialized).toBe(1000);
    expect(p.metrics?.nodesPerSec).toBe(250);
  });
});
