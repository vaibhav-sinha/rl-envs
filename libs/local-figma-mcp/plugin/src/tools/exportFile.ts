import type { FigmaPluginSnapshot, SerializedAsset, SerializedNode } from '../snapshotTypes.js';
import { SNAPSHOT_VERSION } from '../snapshotTypes.js';
import {
  findSerializedNodeById,
  findStructuralIconExportRootIds,
  ICON_RASTER_EXPORT_SCALE,
  prefersRasterIconExport,
  tagSerializedIconPngExport,
  tagSerializedIconSvgExport,
} from './iconDetector.js';
import { keysForNodeType } from './nodePropertyKeys.js';
import { bytesToBase64, serializeValue } from './serializeValue.js';

const IMAGE_HASHES = new Set<string>();

/** Reading these can abort the plugin WASM runtime (not catchable in JS). */
const UNSAFE_PROPERTY_KEYS = new Set(['vectorNetwork']);

function collectImageHashes(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const v of value) collectImageHashes(v);
    return;
  }
  const o = value as Record<string, unknown>;
  if (o.type === 'IMAGE' && typeof o.imageHash === 'string') {
    IMAGE_HASHES.add(o.imageHash);
  }
  for (const v of Object.values(o)) collectImageHashes(v);
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

  // Stable string ids — `mainComponent` object graphs can truncate to `{ __ref: 'cycle' }`.
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

function serializeTree(node: BaseNode): SerializedNode {
  const props =
    node.type === 'DOCUMENT' && !('absoluteBoundingBox' in node)
      ? {}
      : serializeNodeProperties(node as BaseNode & Record<string, unknown>);
  const out: SerializedNode = {
    id: node.id,
    type: node.type,
    name: node.name,
    properties: props,
  };
  if ('children' in node && Array.isArray(node.children)) {
    out.children = node.children.map((c) => serializeTree(c));
  }
  return out;
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

async function buildIconExportAssets(document: SerializedNode): Promise<SerializedAsset[]> {
  const iconRootIds = findStructuralIconExportRootIds(document);
  const assets: SerializedAsset[] = [];

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
        assets.push({
          figmaNodeId: nodeId,
          mimeType: 'image/png',
          base64: bytesToBase64(bytes),
          exportScale: ICON_RASTER_EXPORT_SCALE,
        });
        tagSerializedIconPngExport(document, nodeId, nodeId);
      } else {
        const bytes = await exportNode.exportAsync({
          format: 'SVG',
          contentsOnly: true,
          svgOutlineText: true,
          svgIdAttribute: false,
          svgSimplifyStroke: true,
        });
        assets.push({
          figmaNodeId: nodeId,
          mimeType: 'image/svg+xml',
          base64: bytesToBase64(bytes),
        });
        tagSerializedIconSvgExport(document, nodeId, nodeId);
      }
    } catch {
      /* skip failed icon export */
    }
  }

  return assets;
}

async function buildAssets(): Promise<SerializedAsset[]> {
  const assets: SerializedAsset[] = [];
  for (const hash of IMAGE_HASHES) {
    try {
      const img = figma.getImageByHash(hash);
      if (!img) continue;
      const bytes = await img.getBytesAsync();
      const mime = sniffMime(bytes);
      assets.push({
        figmaImageHash: hash,
        mimeType: mime,
        base64: bytesToBase64(bytes),
      });
    } catch {
      /* missing image */
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

export async function buildFigmaPluginSnapshot(): Promise<FigmaPluginSnapshot> {
  IMAGE_HASHES.clear();

  const document = serializeTree(figma.root);
  collectImageHashes(document);

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

  for (const s of [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles]) {
    collectImageHashes(s);
  }

  const variableCollections = await serializeVariableCollections();
  for (const c of variableCollections) collectImageHashes(c);

  const rasterAssets = await buildAssets();
  const iconExportAssets = await buildIconExportAssets(document);
  const assets = [...rasterAssets, ...iconExportAssets];

  return {
    snapshotVersion: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    figmaFileKey: figma.fileKey ?? null,
    figmaFileName: figma.root.name,
    document,
    variableCollections,
    paintStyles,
    textStyles,
    effectStyles,
    gridStyles,
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
