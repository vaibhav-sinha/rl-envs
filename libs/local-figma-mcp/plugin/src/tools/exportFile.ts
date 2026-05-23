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
import { pushInstanceExportDebug } from './instanceExportDebug.js';
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

const INSTANCE_TRI_STATE_PAINT_FIELDS = ['fills', 'strokes', 'backgrounds', 'effects'] as const;
const INSTANCE_TRI_STATE_STYLE_ID_FIELDS = ['fillStyleId', 'strokeStyleId', 'effectStyleId'] as const;
const INSTANCE_SHELL_PAINT_FIELD_SET = new Set<string>(INSTANCE_TRI_STATE_PAINT_FIELDS);

function readInstanceField(inst: InstanceNode, field: string): unknown {
  try {
    return (inst as Record<string, unknown>)[field];
  } catch {
    return undefined;
  }
}

/** Paint fields listed on the instance shell in Figma's overrides array. */
export function getInstanceShellOverriddenPaintFields(inst: InstanceNode): ReadonlySet<string> {
  const fields = new Set<string>();
  const raw = inst.overrides;
  if (!Array.isArray(raw)) return fields;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as { id?: string; overriddenFields?: unknown };
    if (typeof o.id !== 'string' || o.id !== inst.id || !Array.isArray(o.overriddenFields)) continue;
    for (const field of o.overriddenFields) {
      if (typeof field === 'string' && INSTANCE_SHELL_PAINT_FIELD_SET.has(field)) {
        fields.add(field);
      }
    }
  }
  return fields;
}

function logInstanceShellExport(inst: InstanceNode, props: Record<string, unknown>): void {
  const shellOverridden = getInstanceShellOverriddenPaintFields(inst);
  if (shellOverridden.size === 0) return;
  const read = (field: (typeof INSTANCE_TRI_STATE_PAINT_FIELDS)[number]) => {
    const v = readInstanceField(inst, field);
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return `array(${v.length})`;
    return typeof v;
  };
  const written = INSTANCE_TRI_STATE_PAINT_FIELDS.filter((f) =>
    Object.prototype.hasOwnProperty.call(props, f)
  ).map((f) => `${f}=${JSON.stringify(props[f])}`);
  pushInstanceExportDebug(
    `[instance-export] ${inst.id} "${inst.name}" overridden=[${[...shellOverridden].join(',')}] ` +
      `api=${INSTANCE_TRI_STATE_PAINT_FIELDS.map(read).join(' ')} props={${written.join(' ')}} ` +
      `overrides=${Object.prototype.hasOwnProperty.call(props, 'overrides') ? 'yes' : 'no'}`
  );
}

/**
 * Instance shell uses tri-state semantics on import: key absent = inherit master, [] = cleared.
 * Plugin API often returns undefined (not []) for cleared shell paints; trust overrides[] too.
 */
export function enrichInstanceNodeExport(inst: InstanceNode, props: Record<string, unknown>): void {
  const shellOverridden = getInstanceShellOverriddenPaintFields(inst);
  for (const field of INSTANCE_TRI_STATE_PAINT_FIELDS) {
    const paints = readInstanceField(inst, field);
    if (Array.isArray(paints) && paints.length === 0) {
      props[field] = [];
    } else if (shellOverridden.has(field)) {
      props[field] = [];
    }
  }
  for (const field of INSTANCE_TRI_STATE_STYLE_ID_FIELDS) {
    const styleId = readInstanceField(inst, field);
    if (styleId === '' || styleId === null) {
      props[field] = null;
    }
  }
}

/** Expand Figma API overrides array into a patch map (import-friendly) for the instance shell. */
export function exportInstanceOverridesRecord(
  inst: InstanceNode,
  props: Record<string, unknown>,
  visited: WeakSet<object>
): void {
  const raw = inst.overrides;
  if (!Array.isArray(raw)) return;
  const map: Record<string, unknown> = {};
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const o = entry as { id?: string; overriddenFields?: unknown };
    if (typeof o.id !== 'string' || o.id !== inst.id || !Array.isArray(o.overriddenFields)) continue;
    const patch: Record<string, unknown> = {};
    for (const field of o.overriddenFields) {
      if (typeof field !== 'string') continue;
      const val = readInstanceField(inst, field);
      if (INSTANCE_SHELL_PAINT_FIELD_SET.has(field)) {
        if (val === undefined || (Array.isArray(val) && val.length === 0)) {
          patch[field] = [];
          continue;
        }
      }
      if (val === undefined) continue;
      try {
        patch[field] = serializeValue(val, visited);
      } catch {
        /* skip unreadable */
      }
    }
    if (Object.keys(patch).length > 0) map[o.id] = patch;
  }
  if (Object.keys(map).length > 0) props.overrides = map;
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
    const inst = node as InstanceNode;
    try {
      const mc = inst.mainComponent;
      if (mc && typeof mc.id === 'string') {
        props.mainComponentId = mc.id;
      }
    } catch {
      /* detached or unreadable */
    }
    try {
      enrichInstanceNodeExport(inst, props);
      exportInstanceOverridesRecord(inst, props, visited);
      logInstanceShellExport(inst, props);
    } catch {
      /* skip unreadable instance shell fields */
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

export type ReferencedStyleIds = {
  paint: Set<string>;
  text: Set<string>;
  effect: Set<string>;
  grid: Set<string>;
};

/** Collect style ids referenced by nodes in the live document (includes library/team styles). */
export function collectReferencedStyleIds(root: BaseNode): ReferencedStyleIds {
  const paint = new Set<string>();
  const text = new Set<string>();
  const effect = new Set<string>();
  const grid = new Set<string>();

  function addStyleId(field: string, id: unknown, bucket: Set<string>): void {
    if (typeof id === 'string' && id.length > 0) bucket.add(id);
  }

  function walk(node: BaseNode): void {
    if ('fillStyleId' in node) addStyleId('fillStyleId', node.fillStyleId, paint);
    if ('strokeStyleId' in node) addStyleId('strokeStyleId', node.strokeStyleId, paint);
    if ('textStyleId' in node) addStyleId('textStyleId', node.textStyleId, text);
    if ('effectStyleId' in node) addStyleId('effectStyleId', node.effectStyleId, effect);
    if ('gridStyleId' in node) addStyleId('gridStyleId', node.gridStyleId, grid);
    if ('children' in node) {
      for (const child of node.children) walk(child);
    }
  }

  walk(root);
  return { paint, text, effect, grid };
}

async function appendReferencedStyles(
  localRecords: Record<string, unknown>[],
  referencedIds: Set<string>,
  styleType: 'PAINT' | 'TEXT' | 'EFFECT' | 'GRID'
): Promise<Record<string, unknown>[]> {
  const out = [...localRecords];
  const known = new Set(out.map((s) => String(s.id)));
  for (const id of referencedIds) {
    if (known.has(id)) continue;
    try {
      const style = await figma.getStyleByIdAsync(id);
      if (!style || style.type !== styleType) continue;
      out.push(
        await serializeStyleRecord(style as unknown as { id: string; name: string } & Record<string, unknown>)
      );
      known.add(id);
    } catch {
      /* skip unreadable library styles */
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

  const referenced = collectReferencedStyleIds(figma.root);
  const paintStylesWithRefs = await appendReferencedStyles(paintStyles, referenced.paint, 'PAINT');
  const textStylesWithRefs = await appendReferencedStyles(textStyles, referenced.text, 'TEXT');
  const effectStylesWithRefs = await appendReferencedStyles(effectStyles, referenced.effect, 'EFFECT');
  const gridStylesWithRefs = await appendReferencedStyles(gridStyles, referenced.grid, 'GRID');

  return {
    variableCollections,
    paintStyles: paintStylesWithRefs,
    textStyles: textStylesWithRefs,
    effectStyles: effectStylesWithRefs,
    gridStyles: gridStylesWithRefs,
    styleRecords: [
      ...paintStylesWithRefs,
      ...textStylesWithRefs,
      ...effectStylesWithRefs,
      ...gridStylesWithRefs,
      ...variableCollections,
    ],
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
