import type { StreamPart } from '../streamProtocol.js';
import { STREAM_PROTOCOL_VERSION, streamPartToLine } from '../streamProtocol.js';
import { SNAPSHOT_VERSION } from '../snapshotTypes.js';
import type { SerializedNode } from '../snapshotTypes.js';
import { countExportTotals } from './countNodes.js';
import {
  findStructuralIconExportRootIds,
  findSerializedNodeById,
  ICON_RASTER_EXPORT_SCALE,
  prefersRasterIconExport,
  resolveMixedFillVectorExportIds,
} from './iconDetector.js';
import { ExportAssetDedup } from './exportAssetDedup.js';
import { exportContentKey } from './exportAssetDedup.js';
import { bytesToBase64 } from './serializeValue.js';
import { sha256Hex } from './sha256.js';
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

function collectMixedFillVectorNodeIds(node: BaseNode, out: string[]): void {
  if (node.type === 'VECTOR') {
    try {
      const v = node as VectorNode;
      if (v.fills === figma.mixed) out.push(node.id);
    } catch {
      /* skip */
    }
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const ch of node.children) collectMixedFillVectorNodeIds(ch, out);
  }
}

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

export interface StreamExportCallbacks {
  onProgress: (
    phase: 'count' | 'serialize' | 'icons' | 'images',
    current: number,
    total: number,
    detail?: string
  ) => void;
}

/** Build in-memory document tree while yielding tree_enter / tree_exit lines. */
function buildDocumentFromTreeEvents(
  root: BaseNode,
  excludeIds: Set<string>
): { document: SerializedNode; lines: string[] } {
  const lines: string[] = [];
  const stack: SerializedNode[] = [];
  let document: SerializedNode | null = null;

  for (const ev of serializeTreeEvents(root, excludeIds, false)) {
    if (ev.kind === 'tree_enter') {
      lines.push(streamPartToLine({ kind: 'tree_enter', node: ev.node }));
      const sn: SerializedNode = {
        id: ev.node.id,
        type: ev.node.type,
        name: ev.node.name,
        properties: ev.node.properties,
        children: [],
      };
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children = parent.children ?? [];
        parent.children.push(sn);
      } else {
        document = sn;
      }
      stack.push(sn);
    } else {
      lines.push(streamPartToLine({ kind: 'tree_exit' }));
      stack.pop();
    }
  }

  if (!document) throw new Error('EXPORT_ERROR: document tree empty after exclusions');
  return { document, lines };
}

/** Yields NDJSON lines for Task Builder streaming import. */
export async function* streamFigmaExportLines(
  exportId: string,
  hfcFileName: string,
  options: BuildSnapshotOptions,
  callbacks: StreamExportCallbacks
): AsyncGenerator<string> {
  clearImageHashesForExport();
  const name = hfcFileName.trim() || figma.root.name;
  const excludeIds = new Set(options.excludeNodeIds ?? []);

  callbacks.onProgress('count', 0, 1, 'Counting nodes…');
  const counts = countExportTotals(options.excludeNodeIds);
  callbacks.onProgress('count', 1, 1);

  yield streamPartToLine({
    kind: 'session_start',
    streamProtocol: STREAM_PROTOCOL_VERSION,
    exportId,
    hfcFileName: name,
    snapshotVersion: SNAPSHOT_VERSION,
    figmaFileKey: figma.fileKey ?? null,
    figmaFileName: figma.root.name,
    totals: {
      nodes: counts.nodes,
      iconExports: 0,
      rasterImages: counts.rasterImages,
    },
  });

  const meta = await serializeMetaAndStyles();
  yield streamPartToLine({
    kind: 'meta',
    exportedAt: new Date().toISOString(),
    variableCollections: meta.variableCollections,
    paintStyles: meta.paintStyles,
    textStyles: meta.textStyles,
    effectStyles: meta.effectStyles,
    gridStyles: meta.gridStyles,
  });

  const { document, lines: treeLines } = buildDocumentFromTreeEvents(figma.root, excludeIds);
  let serializeCurrent = 0;
  for (const line of treeLines) {
    if (line.includes('"tree_enter"')) {
      serializeCurrent += 1;
      callbacks.onProgress('serialize', serializeCurrent, counts.nodes);
    }
    yield line;
  }

  collectImageHashesForExport(document);
  for (const s of meta.styleRecords) {
    collectImageHashesForExport(s);
  }

  const iconRootIds = findStructuralIconExportRootIds(document);
  const mixedIds: string[] = [];
  collectMixedFillVectorNodeIds(figma.root, mixedIds);
  const mixedExportIds = resolveMixedFillVectorExportIds(document, mixedIds);
  const iconWorkTotal = iconRootIds.length + mixedExportIds.length;

  const iconDedup = new ExportAssetDedup();
  let iconCurrent = 0;

  for (const nodeId of iconRootIds) {
    iconCurrent += 1;
    callbacks.onProgress('icons', iconCurrent, iconWorkTotal);
    const serialized = findSerializedNodeById(document, nodeId);
    if (!serialized) continue;

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('exportAsync' in node)) continue;

    const exportNode = node as SceneNode & {
      exportAsync: (settings: ExportSettings) => Promise<Uint8Array>;
    };

    try {
      if (prefersRasterIconExport(serialized)) {
        const bytes = await exportNode.exportAsync({
          format: 'PNG',
          contentsOnly: true,
          constraint: { type: 'SCALE', value: ICON_RASTER_EXPORT_SCALE },
        });
        if (iconDedup.registerNodeExport(nodeId, bytes, 'image/png', document, ICON_RASTER_EXPORT_SCALE)) {
          yield streamPartToLine(
            assetPartFromBytes(bytes, 'image/png', {
              figmaNodeId: nodeId,
              exportScale: ICON_RASTER_EXPORT_SCALE,
            })
          );
        }
      } else {
        const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
        if (iconDedup.registerNodeExport(nodeId, bytes, 'image/svg+xml', document)) {
          yield streamPartToLine(assetPartFromBytes(bytes, 'image/svg+xml', { figmaNodeId: nodeId }));
        }
      }
    } catch {
      /* skip */
    }
  }

  for (const nodeId of mixedExportIds) {
    iconCurrent += 1;
    callbacks.onProgress('icons', iconCurrent, iconWorkTotal);
    const serialized = findSerializedNodeById(document, nodeId);
    if (!serialized) continue;

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('exportAsync' in node)) continue;

    const exportNode = node as SceneNode & {
      exportAsync: (settings: ExportSettings) => Promise<Uint8Array>;
    };

    try {
      const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
      if (iconDedup.registerNodeExport(nodeId, bytes, 'image/svg+xml', document)) {
        yield streamPartToLine(assetPartFromBytes(bytes, 'image/svg+xml', { figmaNodeId: nodeId }));
      }
    } catch {
      /* skip */
    }
  }

  const rasterHashes = getImageHashesSet();
  const seenRasterKeys = new Set<string>();
  let imageCurrent = 0;
  const rasterTotal = rasterHashes.size;

  for (const hash of rasterHashes) {
    imageCurrent += 1;
    callbacks.onProgress('images', imageCurrent, rasterTotal);
    try {
      const img = figma.getImageByHash(hash);
      if (!img) continue;
      const bytes = await img.getBytesAsync();
      const mime = sniffMime(bytes);
      const contentKey = exportContentKey(bytes, mime);
      if (seenRasterKeys.has(contentKey)) continue;
      seenRasterKeys.add(contentKey);
      yield streamPartToLine(assetPartFromBytes(bytes, mime, { figmaImageHash: hash }));
    } catch {
      /* missing */
    }
  }

  yield streamPartToLine({ kind: 'session_end', exportId });
}
