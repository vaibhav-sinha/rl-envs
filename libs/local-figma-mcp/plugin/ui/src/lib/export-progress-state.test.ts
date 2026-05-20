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
});
