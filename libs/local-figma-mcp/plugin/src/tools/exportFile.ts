import { BLANK_PNG_BYTES } from '../blankPng.js';
import type { FigmaPluginSnapshot, SerializedAsset, SerializedNode } from '../snapshotTypes.js';
import { SNAPSHOT_VERSION } from '../snapshotTypes.js';
import type { SerializedNodeWire } from '../streamProtocol.js';
import {
  findStructuralIconExportRootIds,
  findSerializedNodeById,
  ICON_RASTER_EXPORT_SCALE,
  prefersRasterIconExport,
  resolveMixedFillVectorExportIds,
  tagSerializedIconPngExport,
  tagSerializedIconSvgExport,
} from './iconDetector.js';
import { ExportAssetDedup } from './exportAssetDedup.js';
import { keysForNodeType } from './nodePropertyKeys.js';
import { bytesToBase64, serializeValue } from './serializeValue.js';
import { enrichTextNodeExport } from './textNodeExport.js';

const IMAGE_HASHES = new Set<string>();

/** Reading these can abort the plugin WASM runtime (not catchable in JS). */
const UNSAFE_PROPERTY_KEYS = new Set(['vectorNetwork']);

export function collectImageHashesForExport(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value) collectImageHashesForExport(v);
    return;
  }
  const o = value as Record<string, unknown>;
  if (o.type === 'IMAGE' && typeof o.imageHash === 'string') {
    IMAGE_HASHES.add(o.imageHash);
  }
  for (const v of Object.values(o)) collectImageHashesForExport(v);
}

export function getImageHashesSet(): Set<string> {
  return IMAGE_HASHES;
}

export function clearImageHashesForExport(): void {
  IMAGE_HASHES.clear();
}

function serializeNodeProperties(node: BaseNode & Record<string, unknown>): Record<string, unknown> {
  const visited = new WeakSet<object>();
  const props: Record<string, unknown> = {};
  const keys = keysForNodeType(node.type);

  for (const key of keys) {
    if (UNSAFE_PROPERTY_KEYS.has(key)) continue;
    try {
      const val = node[key];
      if (val === undefined) continue;
      props[key] = serializeValue(val, visited);
    } catch {
      /* skip unreadable */
    }
  }

  if ('absoluteBoundingBox' in node && node.absoluteBoundingBox) {
    props.absoluteBoundingBox = serializeValue(node.absoluteBoundingBox, visited);
  }
  if ('absoluteRenderBounds' in node && node.absoluteRenderBounds) {
    props.absoluteRenderBounds = serializeValue(node.absoluteRenderBounds, visited);
  }

  if (node.type === 'TEXT') {
    enrichTextNodeExport(node as TextNode, props, visited);
  }

  if (node.type === 'INSTANCE') {
    try {
      const mc = (node as InstanceNode).mainComponent;
      if (mc && typeof mc.id === 'string') {
        props.mainComponentId = mc.id;
      }
    } catch {
      /* detached or unreadable */
    }
  }
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
    try {
      const key = (node as ComponentNode).key;
      if (typeof key === 'string' && key.length > 0) {
        props.componentKey = key;
      }
    } catch {
      /* skip */
    }
  }

  return props;
}

export interface BuildSnapshotOptions {
  excludeNodeIds?: string[];
}

export type TreeStreamEvent =
  | { kind: 'tree_enter'; node: SerializedNodeWire }
  | { kind: 'tree_exit' };

export interface SerializeTreeOptions {
  onNodeVisit?: (node: BaseNode) => void;
}

export function* serializeTreeEvents(
  node: BaseNode,
  excludeIds: Set<string>,
  ancestorExcluded: boolean,
  options: SerializeTreeOptions = {}
): Generator<TreeStreamEvent> {
  const selfExcluded = ancestorExcluded || excludeIds.has(node.id);
  if (selfExcluded && node.type !== 'DOCUMENT') {
    return;
  }

  options.onNodeVisit?.(node);

  const props =
    node.type === 'DOCUMENT' && !('absoluteBoundingBox' in node)
      ? {}
      : serializeNodeProperties(node as BaseNode & Record<string, unknown>);

  yield {
    kind: 'tree_enter',
    node: {
      id: node.id,
      type: node.type,
      name: node.name,
      properties: props,
    },
  };

  if ('children' in node && Array.isArray(node.children)) {
    for (const c of node.children) {
      yield* serializeTreeEvents(c, excludeIds, selfExcluded, options);
    }
  }

  yield { kind: 'tree_exit' };
}

function serializeTree(node: BaseNode, excludeIds: Set<string>, ancestorExcluded: boolean): SerializedNode | null {
  const stack: SerializedNode[] = [];
  let root: SerializedNode | null = null;

  for (const ev of serializeTreeEvents(node, excludeIds, ancestorExcluded)) {
    if (ev.kind === 'tree_enter') {
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
        root = sn;
      }
      stack.push(sn);
    } else {
      stack.pop();
    }
  }

  if (root && root.children && root.children.length === 0) {
    delete root.children;
  }
  return root;
}

async function serializeStyleRecord(style: { id: string; name: string } & Record<string, unknown>): Promise<Record<string, unknown>> {
  const visited = new WeakSet<object>();
  const keys = Object.keys(style).filter((k) => k !== 'remove' && typeof (style as Record<string, unknown>)[k] !== 'function');
  const out: Record<string, unknown> = { id: style.id, name: style.name };
  for (const key of keys) {
    if (key === 'id' || key === 'name') continue;
    try {
      const val = (style as Record<string, unknown>)[key];
      if (val === undefined) continue;
      out[key] = serializeValue(val, visited);
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function serializeMetaAndStyles(): Promise<{
  variableCollections: Record<string, unknown>[];
  paintStyles: Record<string, unknown>[];
  textStyles: Record<string, unknown>[];
  effectStyles: Record<string, unknown>[];
  gridStyles: Record<string, unknown>[];
  styleRecords: Record<string, unknown>[];
}> {
  const paintStyles = await Promise.all(
    (await figma.getLocalPaintStylesAsync()).map((s) => serializeStyleRecord(s as unknown as { id: string; name: string } & Record<string, unknown>))
  );
  const textStyles = await Promise.all(
    (await figma.getLocalTextStylesAsync()).map((s) => serializeStyleRecord(s as unknown as { id: string; name: string } & Record<string, unknown>))
  );
  const effectStyles = await Promise.all(
    (await figma.getLocalEffectStylesAsync()).map((s) => serializeStyleRecord(s as unknown as { id: string; name: string } & Record<string, unknown>))
  );
  const gridStyles = await Promise.all(
    (await figma.getLocalGridStylesAsync()).map((s) => serializeStyleRecord(s as unknown as { id: string; name: string } & Record<string, unknown>))
  );
  const variableCollections = await serializeVariableCollections();

  return {
    variableCollections,
    paintStyles,
    textStyles,
    effectStyles,
    gridStyles,
    styleRecords: [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles, ...variableCollections],
  };
}

async function buildIconExportAssets(document: SerializedNode, dedup: ExportAssetDedup): Promise<void> {
  const iconRootIds = findStructuralIconExportRootIds(document);

  for (const nodeId of iconRootIds) {
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
        const reg = dedup.registerNodeExport(nodeId, bytes, 'image/png', ICON_RASTER_EXPORT_SCALE);
        tagSerializedIconPngExport(document, nodeId, reg.canonicalNodeId);
      } else {
        const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
        const reg = dedup.registerNodeExport(nodeId, bytes, 'image/svg+xml');
        tagSerializedIconSvgExport(document, nodeId, reg.canonicalNodeId);
      }
    } catch {
      /* skip failed icon export */
    }
  }
}

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
      /* skip unreadable */
    }
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const ch of node.children) collectMixedFillVectorNodeIds(ch, out);
  }
}

async function buildMixedFillVectorExportAssets(document: SerializedNode, dedup: ExportAssetDedup): Promise<void> {
  const mixedIds: string[] = [];
  collectMixedFillVectorNodeIds(figma.root, mixedIds);
  const nodeIds = resolveMixedFillVectorExportIds(document, mixedIds);

  for (const nodeId of nodeIds) {
    const serialized = findSerializedNodeById(document, nodeId);
    if (!serialized) continue;

    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node || !('exportAsync' in node)) continue;

    const exportNode = node as SceneNode & {
      exportAsync: (settings: ExportSettings) => Promise<Uint8Array>;
    };

    try {
      const bytes = await exportNode.exportAsync(SVG_EXPORT_SETTINGS);
      const reg = dedup.registerNodeExport(nodeId, bytes, 'image/svg+xml');
      tagSerializedIconSvgExport(document, nodeId, reg.canonicalNodeId);
    } catch {
      /* skip failed mixed-fill vector export */
    }
  }
}

async function buildAssets(): Promise<SerializedAsset[]> {
  const assets: SerializedAsset[] = [];
  for (const hash of IMAGE_HASHES) {
    try {
      const img = figma.getImageByHash(hash);
      const bytes = img ? await img.getBytesAsync() : BLANK_PNG_BYTES;
      const mime = img ? sniffMime(bytes) : 'image/png';
      assets.push({
        figmaImageHash: hash,
        mimeType: mime,
        base64: bytesToBase64(bytes),
      });
    } catch {
      assets.push({
        figmaImageHash: hash,
        mimeType: 'image/png',
        base64: bytesToBase64(BLANK_PNG_BYTES),
      });
    }
  }
  return assets;
}

function sniffMime(bytes: Uint8Array): SerializedAsset['mimeType'] {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return 'image/gif';
  if (bytes.length > 12 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return 'image/png';
}

async function serializeVariableCollections(): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  for (const col of collections) {
    const variables: Record<string, unknown>[] = [];
    for (const vid of col.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(vid);
      if (!v) continue;
      variables.push(await serializeStyleRecord(v as unknown as { id: string; name: string } & Record<string, unknown>));
    }
    out.push({
      id: col.id,
      name: col.name,
      modes: col.modes.map((m) => ({ id: m.modeId, name: m.name })),
      defaultModeId: col.defaultModeId,
      variableIds: [...col.variableIds],
      variables,
    });
  }
  return out;
}

export async function buildFigmaPluginSnapshot(
  options: BuildSnapshotOptions = {}
): Promise<FigmaPluginSnapshot> {
  clearImageHashesForExport();

  const excludeIds = new Set(options.excludeNodeIds ?? []);
  const documentNode = serializeTree(figma.root, excludeIds, false);
  if (!documentNode) {
    throw new Error('EXPORT_ERROR: document tree empty after exclusions');
  }
  const document = documentNode;
  collectImageHashesForExport(document);

  const meta = await serializeMetaAndStyles();
  for (const s of meta.styleRecords) {
    collectImageHashesForExport(s);
  }

  const rasterAssets = await buildAssets();
  const iconDedup = new ExportAssetDedup();
  await buildIconExportAssets(document, iconDedup);
  await buildMixedFillVectorExportAssets(document, iconDedup);
  const assets = [...rasterAssets, ...iconDedup.getAssets()];

  return {
    snapshotVersion: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    figmaFileKey: figma.fileKey ?? null,
    figmaFileName: figma.root.name,
    document,
    variableCollections: meta.variableCollections,
    paintStyles: meta.paintStyles,
    textStyles: meta.textStyles,
    effectStyles: meta.effectStyles,
    gridStyles: meta.gridStyles,
    assets,
  };
}

export const EXPORT_CHUNK_CHARS = 480_000;

export function chunkSnapshotJson(json: string): string[] {
  if (json.length <= EXPORT_CHUNK_CHARS) return [json];
  const chunks: string[] = [];
  for (let i = 0; i < json.length; i += EXPORT_CHUNK_CHARS) {
    chunks.push(json.slice(i, i + EXPORT_CHUNK_CHARS));
  }
  return chunks;
}
