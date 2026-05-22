import { logExportError } from '../exportError.js';
import { buildExportExcludeIds } from '../exportScope.js';
import type { ExportMetricsCollector } from '../exportMetrics.js';
import { shouldEmitProgressMetrics } from '../exportMetrics.js';
import type { ExportUploadGate } from '../exportUploadGate.js';
import type { ExportProgressReporter } from '../exportProgressReporter.js';
import type {
  ExportTotals,
  IconUploadStats,
  SerializedNodeWire,
  StreamPart,
} from '../streamProtocol.js';
import {
  EXPORT_PROGRESS_EVERY_NODES,
  ICON_EXPORT_CONCURRENCY,
  STREAM_PROTOCOL_VERSION,
  TREE_SERIALIZE_YIELD_EVERY,
  iconPropsBatchCount,
  streamPartToLine,
} from '../streamProtocol.js';
import { mapPool } from './asyncPool.js';
import { SNAPSHOT_VERSION } from '../snapshotTypes.js';
import { ICON_RASTER_EXPORT_SCALE, prefersRasterIconExport } from './iconDetector.js';
import { IconExportRegistry } from './iconExportRegistry.js';
import type { IconTreeAnalysis } from './iconDetector.js';
import { IncrementalIconWalk } from './incrementalIconWalk.js';
import { bytesToBase64 } from './serializeValue.js';
import { sha256Hex } from './sha256.js';
import { RasterExportPipeline } from './rasterPipeline.js';
import {
  clearImageHashesForExport,
  collectImageHashesForExport,
  getImageHashesSet,
  serializeMetaAndStyles,
  serializeTreeEvents,
} from './exportFile.js';

const SVG_EXPORT_SETTINGS = {
  format: 'SVG',
  contentsOnly: true,
  svgOutlineText: true,
  svgIdAttribute: false,
  svgSimplifyStroke: true,
} as ExportSettings;

type AssetMime = Extract<StreamPart, { kind: 'asset' }>['mimeType'];

function assetPartFromBytes(
  bytes: Uint8Array,
  mimeType: AssetMime,
  fields: { figmaNodeId?: string; figmaImageHash?: string; exportScale?: number }
): Extract<StreamPart, { kind: 'asset' }> {
  return {
    kind: 'asset',
    contentHash: sha256Hex(bytes),
    mimeType,
    bytesBase64: bytesToBase64(bytes),
    ...fields,
  };
}

function iconPropsPart(
  nodeId: string,
  mimeType: 'image/png' | 'image/svg+xml',
  canonicalNodeId: string
): Extract<StreamPart, { kind: 'node_props' }> {
  return {
    kind: 'node_props',
    nodeId,
    properties:
      mimeType === 'image/png'
        ? { hfcIconPngAsset: canonicalNodeId }
        : { hfcIconSvgAsset: canonicalNodeId },
  };
}

function visitMixedFillVector(node: BaseNode, walk: IncrementalIconWalk): void {
  if (node.type === 'VECTOR') {
    try {
      const v = node as VectorNode;
      if (v.fills === figma.mixed) walk.recordMixedFillVector(node.id);
    } catch {
      /* skip */
    }
  }
}

export interface RunFigmaStreamExportOptions {
  exportId: string;
  hfcFileName: string;
  excludeNodeIds?: string[];
  includePageIds?: string[];
  gate: ExportUploadGate;
  metrics: ExportMetricsCollector;
  progress: ExportProgressReporter;
  onSessionTotals?: (totals: ExportTotals) => void;
  onIconPhaseComplete?: (stats: IconUploadStats) => void;
}

type ExportableNode = SceneNode & {
  exportAsync: (settings: ExportSettings) => Promise<Uint8Array>;
};

type IconExportJob = { nodeId: string; kind: 'root' | 'mixed' };

interface IconExportPrepared {
  nodeId: string;
  wire?: SerializedNodeWire;
  analysis?: IconTreeAnalysis;
  exportNode: ExportableNode;
}

function createRegistryLock(): {
  runExclusive<T>(fn: () => Promise<T>): Promise<T>;
} {
  let tail: Promise<void> = Promise.resolve();
  return {
    runExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const run = tail.then(fn);
      tail = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    },
  };
}

async function exportIconRoot(
  nodeId: string,
  wire: SerializedNodeWire,
  analysis: IconTreeAnalysis,
  exportNode: ExportableNode,
  registry: IconExportRegistry,
  gate: ExportUploadGate,
  registryLock: ReturnType<typeof createRegistryLock>
): Promise<void> {
  const skip = await registryLock.runExclusive(() =>
    Promise.resolve(registry.tryMainComponentSkip(wire, analysis))
  );
  if (skip) {
    await gate.postIconPropsLine(
      streamPartToLine(iconPropsPart(nodeId, skip.mimeType, skip.canonicalNodeId))
    );
    return;
  }

  const serialized = { id: wire.id, type: wire.type, name: wire.name, properties: wire.properties };

  try {
    if (prefersRasterIconExport(serialized, analysis)) {
      const bytes = await exportNode.exportAsync({
        format: 'PNG',
        contentsOnly: true,
        constraint: { type: 'SCALE', value: ICON_RASTER_EXPORT_SCALE },
      });
      await registryLock.runExclusive(async () => {
        const reg = registry.registerAfterExport(
          nodeId,
          bytes,
          'image/png',
          ICON_RASTER_EXPORT_SCALE,
          wire
        );
        await gate.postIconPropsLine(
          streamPartToLine(iconPropsPart(nodeId, 'image/png', reg.canonicalNodeId))
        );
        if (reg.emitAsset) {
          await gate.postLine(
            streamPartToLine(
              assetPartFromBytes(bytes, 'image/png', {
                figmaNodeId: reg.canonicalNodeId,
                exportScale: ICON_RASTER_EXPORT_SCALE,
              })
            )
          );
        }
      });
    } else {
      const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
      await registryLock.runExclusive(async () => {
        const reg = registry.registerAfterExport(nodeId, bytes, 'image/svg+xml', undefined, wire);
        await gate.postIconPropsLine(
          streamPartToLine(iconPropsPart(nodeId, 'image/svg+xml', reg.canonicalNodeId))
        );
        if (reg.emitAsset) {
          await gate.postLine(
            streamPartToLine(
              assetPartFromBytes(bytes, 'image/svg+xml', { figmaNodeId: reg.canonicalNodeId })
            )
          );
        }
      });
    }
  } catch (error) {
    logExportError(`icons/exportRoot nodeId=${nodeId}`, error, 'warn');
  }
}

async function exportMixedFillVector(
  nodeId: string,
  exportNode: ExportableNode,
  registry: IconExportRegistry,
  gate: ExportUploadGate,
  registryLock: ReturnType<typeof createRegistryLock>
): Promise<void> {
  try {
    const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
    await registryLock.runExclusive(async () => {
      const reg = registry.registerAfterExport(nodeId, bytes, 'image/svg+xml', undefined, undefined);
      await gate.postIconPropsLine(
        streamPartToLine(iconPropsPart(nodeId, 'image/svg+xml', reg.canonicalNodeId))
      );
      if (reg.emitAsset) {
        await gate.postLine(
          streamPartToLine(
            assetPartFromBytes(bytes, 'image/svg+xml', { figmaNodeId: reg.canonicalNodeId })
          )
        );
      }
    });
  } catch (error) {
    logExportError(`icons/exportMixedFill nodeId=${nodeId}`, error, 'warn');
  }
}

async function prepareIconJob(
  job: IconExportJob,
  iconWalk: IncrementalIconWalk
): Promise<IconExportPrepared | null> {
  const node = await figma.getNodeByIdAsync(job.nodeId);
  if (!node || !('exportAsync' in node)) return null;

  if (job.kind === 'mixed') {
    return { nodeId: job.nodeId, exportNode: node as ExportableNode };
  }

  const wire = iconWalk.getIconWire(job.nodeId);
  const analysis = iconWalk.iconAnalysisById.get(job.nodeId);
  if (!wire || !analysis) return null;
  return { nodeId: job.nodeId, wire, analysis, exportNode: node as ExportableNode };
}

/** Run full NDJSON export through the upload gate (sync tree serialize, pipelined upload). */
export async function runFigmaStreamExport(options: RunFigmaStreamExportOptions): Promise<void> {
  const { exportId, gate, metrics, progress } = options;
  clearImageHashesForExport();
  const name = options.hfcFileName.trim() || figma.root.name;
  const excludeIds = buildExportExcludeIds(options.excludeNodeIds, options.includePageIds);

  metrics.setPhase('meta');
  await gate.postLine(
    streamPartToLine({
      kind: 'session_start',
      streamProtocol: STREAM_PROTOCOL_VERSION,
      exportId,
      hfcFileName: name,
      snapshotVersion: SNAPSHOT_VERSION,
      figmaFileKey: figma.fileKey ?? null,
      figmaFileName: figma.root.name,
      totals: { nodes: 0, iconExports: 0, rasterImages: 0 },
    })
  );

  const meta = await serializeMetaAndStyles();
  progress.onMetaDone();

  await gate.postLine(
    streamPartToLine({
      kind: 'meta',
      exportedAt: new Date().toISOString(),
      variableCollections: meta.variableCollections,
      paintStyles: meta.paintStyles,
      textStyles: meta.textStyles,
      effectStyles: meta.effectStyles,
      gridStyles: meta.gridStyles,
    })
  );

  for (const s of meta.styleRecords) {
    collectImageHashesForExport(s);
  }

  metrics.setPhase('serialize');
  const iconWalk = new IncrementalIconWalk();
  const treeStack: string[] = [];
  let serializeCurrent = 0;

  for (const ev of serializeTreeEvents(figma.root, excludeIds, false, {
    onNodeVisit: (node) => visitMixedFillVector(node, iconWalk),
  })) {
    metrics.beginSerializeSlice();
    if (ev.kind === 'tree_enter') {
      const parentId = treeStack[treeStack.length - 1] ?? null;
      iconWalk.onTreeEnter(ev.node, parentId);
      collectImageHashesForExport(ev.node.properties);
      treeStack.push(ev.node.id);
      serializeCurrent += 1;
      metrics.incrementNodesSerialized();

      gate.pushTreeLine(streamPartToLine({ kind: 'tree_enter', node: ev.node }));
      await gate.flushTreeBatchIfNeeded();
    } else {
      treeStack.pop();
      iconWalk.onTreeExit();
      gate.pushTreeLine(streamPartToLine({ kind: 'tree_exit' }));
      await gate.flushTreeBatchIfNeeded();
    }
    metrics.endSerializeSlice();

    if (serializeCurrent > 0 && serializeCurrent % TREE_SERIALIZE_YIELD_EVERY === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    if (shouldEmitProgressMetrics(serializeCurrent, EXPORT_PROGRESS_EVERY_NODES)) {
      progress.onSerializeProgress(serializeCurrent);
    }
  }

  if (serializeCurrent === 0) {
    throw new Error('EXPORT_ERROR: document tree empty after exclusions');
  }

  await gate.flushTreeBatch();

  const iconRootIds = iconWalk.finishIconRootIds();
  const mixedExportIds = iconWalk.finishMixedFillExportIds(iconRootIds);
  const iconWorkTotal = iconRootIds.length + mixedExportIds.length;
  const rasterTotal = getImageHashesSet().size;

  const totals: ExportTotals = {
    nodes: serializeCurrent,
    iconExports: iconWorkTotal,
    rasterImages: rasterTotal,
  };
  options.onSessionTotals?.(totals);
  progress.onSessionTotals(totals);

  await gate.postLine(
    streamPartToLine({
      kind: 'session_totals',
      ...totals,
    })
  );

  progress.onSerializeComplete(serializeCurrent);

  metrics.setPhase('icons');
  const iconRegistry = new IconExportRegistry();
  const registryLock = createRegistryLock();

  const iconJobs: IconExportJob[] = [
    ...iconRootIds.map((nodeId) => ({ nodeId, kind: 'root' as const })),
    ...mixedExportIds.map((nodeId) => ({ nodeId, kind: 'mixed' as const })),
  ];

  if (iconWorkTotal === 0) {
    progress.onIconsProgress(0);
  } else {
    const iconProgressLock = createRegistryLock();
    let iconDone = 0;
    await mapPool(iconJobs, ICON_EXPORT_CONCURRENCY, async (job) => {
      const prepared = await prepareIconJob(job, iconWalk);
      if (!prepared) return;

      if (job.kind === 'root' && prepared.wire && prepared.analysis) {
        await exportIconRoot(
          job.nodeId,
          prepared.wire,
          prepared.analysis,
          prepared.exportNode,
          iconRegistry,
          gate,
          registryLock
        );
      } else if (job.kind === 'mixed') {
        await exportMixedFillVector(
          job.nodeId,
          prepared.exportNode,
          iconRegistry,
          gate,
          registryLock
        );
      }

      await iconProgressLock.runExclusive(async () => {
        iconDone += 1;
        if (
          iconDone % EXPORT_PROGRESS_EVERY_NODES === 0 ||
          iconDone === iconWorkTotal
        ) {
          progress.onIconsProgress(iconDone);
        }
      });
    });
  }

  await gate.flushIconPropsBatch();

  const iconUploadStats: IconUploadStats = {
    iconRoots: iconWorkTotal,
    uniqueIconAssets: iconRegistry.uniqueIconAssets,
    iconPropsBatches: iconPropsBatchCount(iconWorkTotal),
    iconExportCalls: iconRegistry.exportCallCount,
    iconMcSkips: iconRegistry.mcSkipCount,
  };
  options.onIconPhaseComplete?.(iconUploadStats);
  progress.onIconPhaseComplete(iconUploadStats);

  metrics.setPhase('images');
  if (rasterTotal > 0) {
    const rasterHashes = [...getImageHashesSet()];
    const rasterPipeline = new RasterExportPipeline(rasterHashes, gate, metrics, (p) => {
      progress.onImagesProgress(p.fetched, p.uploaded);
    });
    await rasterPipeline.drain();
    const p = rasterPipeline.progress;
    progress.onImagesProgress(p.fetched, p.uploaded);
  } else {
    progress.onImagesProgress(0, 0);
  }

  await gate.postLine(streamPartToLine({ kind: 'session_end', exportId }));
  progress.onExportComplete();
}
