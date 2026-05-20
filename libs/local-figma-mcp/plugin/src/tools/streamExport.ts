import type { ExportMetricsCollector, ExportRunMetrics } from '../exportMetrics.js';
import { shouldEmitProgressMetrics } from '../exportMetrics.js';
import type { ExportUploadGate } from '../exportUploadGate.js';
import type { ExportTotals, StreamPart } from '../streamProtocol.js';
import {
  EXPORT_PROGRESS_EVERY_NODES,
  RASTER_IMAGE_CONCURRENCY,
  STREAM_PROTOCOL_VERSION,
  TREE_SERIALIZE_YIELD_EVERY,
  streamPartToLine,
} from '../streamProtocol.js';
import { poolMapStream } from './asyncPool.js';
import { SNAPSHOT_VERSION } from '../snapshotTypes.js';
import { ICON_RASTER_EXPORT_SCALE, prefersRasterIconExport } from './iconDetector.js';
import { ExportAssetDedup } from './exportAssetDedup.js';
import { IncrementalIconWalk } from './incrementalIconWalk.js';
import { bytesToBase64 } from './serializeValue.js';
import { sha256Hex } from './sha256.js';
import { BLANK_PNG_BYTES } from '../blankPng.js';
import {
  clearImageHashesForExport,
  collectImageHashesForExport,
  getImageHashesSet,
  serializeMetaAndStyles,
  serializeTreeEvents,
  type BuildSnapshotOptions,
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

function sniffMime(bytes: Uint8Array): AssetMime {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return 'image/png';
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

export interface StreamExportProgressCallback {
  (
    phase: 'meta' | 'serialize' | 'icons' | 'images' | 'upload',
    current: number,
    total: number,
    detail?: string,
    metrics?: ExportRunMetrics
  ): void;
}

export interface RunFigmaStreamExportOptions {
  exportId: string;
  hfcFileName: string;
  excludeNodeIds?: string[];
  gate: ExportUploadGate;
  metrics: ExportMetricsCollector;
  onProgress: StreamExportProgressCallback;
  onSessionTotals?: (totals: ExportTotals) => void;
}

/** Run full NDJSON export through the upload gate (sync tree serialize, pipelined upload). */
export async function runFigmaStreamExport(options: RunFigmaStreamExportOptions): Promise<void> {
  const { exportId, gate, metrics, onProgress } = options;
  clearImageHashesForExport();
  const name = options.hfcFileName.trim() || figma.root.name;
  const excludeIds = new Set(options.excludeNodeIds ?? []);

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

  onProgress('meta', 0, 1, 'Loading styles and variables…', metrics.snapshot('meta'));
  const meta = await serializeMetaAndStyles();
  onProgress('meta', 1, 1, undefined, metrics.snapshot('meta'));

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
      onProgress('serialize', serializeCurrent, 0, undefined, metrics.snapshot('serialize'));
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

  await gate.postLine(
    streamPartToLine({
      kind: 'session_totals',
      ...totals,
    })
  );

  onProgress('serialize', serializeCurrent, serializeCurrent, undefined, metrics.snapshot('serialize'));

  metrics.setPhase('icons');
  const iconDedup = new ExportAssetDedup();
  let iconCurrent = 0;

  if (iconWorkTotal === 0) {
    onProgress('icons', 0, 0, undefined, metrics.snapshot('icons'));
  }

  for (const nodeId of iconRootIds) {
    iconCurrent += 1;
    if (
      iconCurrent % EXPORT_PROGRESS_EVERY_NODES === 0 ||
      iconCurrent === iconWorkTotal
    ) {
      onProgress('icons', iconCurrent, iconWorkTotal, undefined, metrics.snapshot('icons'));
    }

    const wire = iconWalk.getIconWire(nodeId);
    const analysis = iconWalk.iconAnalysisById.get(nodeId);
    if (!wire || !analysis) continue;

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('exportAsync' in node)) continue;

    const exportNode = node as SceneNode & {
      exportAsync: (settings: ExportSettings) => Promise<Uint8Array>;
    };

    const serialized = { id: wire.id, type: wire.type, name: wire.name, properties: wire.properties };

    try {
      if (prefersRasterIconExport(serialized, analysis)) {
        const bytes = await exportNode.exportAsync({
          format: 'PNG',
          contentsOnly: true,
          constraint: { type: 'SCALE', value: ICON_RASTER_EXPORT_SCALE },
        });
        const reg = iconDedup.registerNodeExport(nodeId, bytes, 'image/png', ICON_RASTER_EXPORT_SCALE);
        await gate.postLine(streamPartToLine(iconPropsPart(nodeId, 'image/png', reg.canonicalNodeId)));
        if (reg.emitAsset) {
          await gate.postLine(
            streamPartToLine(
              assetPartFromBytes(bytes, 'image/png', {
                figmaNodeId: nodeId,
                exportScale: ICON_RASTER_EXPORT_SCALE,
              })
            )
          );
        }
      } else {
        const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
        const reg = iconDedup.registerNodeExport(nodeId, bytes, 'image/svg+xml');
        await gate.postLine(streamPartToLine(iconPropsPart(nodeId, 'image/svg+xml', reg.canonicalNodeId)));
        if (reg.emitAsset) {
          await gate.postLine(
            streamPartToLine(assetPartFromBytes(bytes, 'image/svg+xml', { figmaNodeId: nodeId }))
          );
        }
      }
    } catch {
      /* skip */
    }
  }

  for (const nodeId of mixedExportIds) {
    iconCurrent += 1;
    if (
      iconCurrent % EXPORT_PROGRESS_EVERY_NODES === 0 ||
      iconCurrent === iconWorkTotal
    ) {
      onProgress('icons', iconCurrent, iconWorkTotal, undefined, metrics.snapshot('icons'));
    }

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('exportAsync' in node)) continue;

    const exportNode = node as SceneNode & {
      exportAsync: (settings: ExportSettings) => Promise<Uint8Array>;
    };

    try {
      const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
      const reg = iconDedup.registerNodeExport(nodeId, bytes, 'image/svg+xml');
      await gate.postLine(streamPartToLine(iconPropsPart(nodeId, 'image/svg+xml', reg.canonicalNodeId)));
      if (reg.emitAsset) {
        await gate.postLine(
          streamPartToLine(assetPartFromBytes(bytes, 'image/svg+xml', { figmaNodeId: nodeId }))
        );
      }
    } catch {
      /* skip */
    }
  }

  metrics.setPhase('images');
  const rasterHashes = [...getImageHashesSet()];

  if (rasterTotal === 0) {
    onProgress('images', 0, 0, undefined, metrics.snapshot('images'));
  }

  let imageDone = 0;
  const seenRasterKeys = new Set<string>();

  for await (const row of poolMapStream(rasterHashes, RASTER_IMAGE_CONCURRENCY, async (hash) => {
    try {
      const img = figma.getImageByHash(hash);
      if (!img) {
        return { hash, bytes: BLANK_PNG_BYTES, mime: 'image/png' as const };
      }
      const bytes = await img.getBytesAsync();
      return { hash, bytes, mime: sniffMime(bytes) };
    } catch {
      return { hash, bytes: BLANK_PNG_BYTES, mime: 'image/png' as const };
    }
  })) {
    imageDone += 1;
    if (
      imageDone % EXPORT_PROGRESS_EVERY_NODES === 0 ||
      imageDone === rasterTotal
    ) {
      onProgress('images', imageDone, rasterTotal, undefined, metrics.snapshot('images'));
    }
    const contentKey = `${row.mime}:${sha256Hex(row.bytes)}`;
    if (seenRasterKeys.has(contentKey)) continue;
    seenRasterKeys.add(contentKey);
    await gate.postLine(
      streamPartToLine(assetPartFromBytes(row.bytes, row.mime, { figmaImageHash: row.hash }))
    );
  }

  await gate.postLine(streamPartToLine({ kind: 'session_end', exportId }));
}
