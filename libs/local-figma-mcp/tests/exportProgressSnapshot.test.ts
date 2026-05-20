import { describe, expect, it } from 'vitest';
import {
  buildExportProgressSnapshot,
  createInitialReporterState,
  deriveActivePhase,
} from '../plugin/src/exportProgressSnapshot.js';
import { ExportMetricsCollector } from '../plugin/src/exportMetrics.js';
import { ExportUploadGate } from '../plugin/src/exportUploadGate.js';

function makeGate() {
  const metrics = new ExportMetricsCollector();
  const gate = new ExportUploadGate({
    exportId: 'exp-1',
    metrics,
    postMessage: () => {},
    onAbortError: () => null,
  });
  return { gate, metrics };
}

describe('deriveActivePhase', () => {
  it('prefers images when raster upload is in progress after icons complete', () => {
    const { gate } = makeGate();
    const state = createInitialReporterState();
    state.metaDone = true;
    state.nodesTotal = 100;
    state.nodesSerialized = 100;
    state.iconsPhaseComplete = true;
    state.imagesTotal = 50;
    state.imagesFetched = 50;
    state.imagesUploaded = 10;

    expect(deriveActivePhase(state, gate)).toBe('images');
  });

  it('reports upload_images when raster assets are still acking', async () => {
    const { gate, metrics } = makeGate();
    const state = createInitialReporterState();
    state.metaDone = true;
    state.nodesTotal = 100;
    state.nodesSerialized = 100;
    state.iconsPhaseComplete = true;
    state.imagesTotal = 2;
    state.imagesFetched = 2;
    state.imagesUploaded = 2;

    await gate.postRasterAsset(
      '{"kind":"asset","mimeType":"image/png","figmaImageHash":"h1"}\n'
    );
    await gate.postRasterAsset(
      '{"kind":"asset","mimeType":"image/png","figmaImageHash":"h2"}\n'
    );
    gate.handleAck(1);

    expect(deriveActivePhase(state, gate)).toBe('upload_images');
    const snap = buildExportProgressSnapshot(state, gate, metrics);
    expect(snap.tracks.upload.rasterAssetsPosted).toBe(2);
    expect(snap.tracks.upload.rasterAssetsAcked).toBe(1);
  });
});

describe('buildExportProgressSnapshot', () => {
  it('includes stable image totals from reporter state', () => {
    const { gate, metrics } = makeGate();
    const state = createInitialReporterState();
    state.metaDone = true;
    state.nodesTotal = 1000;
    state.nodesSerialized = 1000;
    state.imagesTotal = 1203;
    state.imagesUploaded = 412;
    state.imagesFetched = 500;
    state.iconsPhaseComplete = true;

    const snap = buildExportProgressSnapshot(state, gate, metrics);
    expect(snap.tracks.images.total).toBe(1203);
    expect(snap.tracks.images.uploaded).toBe(412);
    expect(snap.tracks.images.fetched).toBe(500);
  });
});
