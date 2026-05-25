import { createHash } from 'node:crypto';
import { ulid } from 'ulid';
import { COMPONENT_MASTERS_PAGE_NAME } from '../persistence/componentGraphNormalize.js';
import type {
  ComponentNode,
  ComponentPropertyValue,
  ComponentSetNode,
  DocumentNode,
  FileEnvelope,
  FrameNode,
  InstanceNode,
  PageNode,
  SceneNode,
  VariableCollection,
  VariableDefinition,
  FontName,
  TextStyleDefinition,
  TextVariableBindings,
  PaintStyleDefinition,
  EffectStyleDefinition,
  GridStyleDefinition,
} from '../model/types.js';
import { normalizeLayoutGrids } from '../engine/figmaInterop.js';
import type { FigmaPluginSnapshot, SerializedAsset, SerializedNode } from './snapshotSchema.js';
import { FigmaIdMap } from './idMap.js';
import { createImportReport, importDebug, importStrict, importVerbose, type ImportReport } from './importReport.js';
import { containerChildPageOrigin } from '../geometry/coordinates.js';
import {
  boundsFromProps,
  type ParentPageOrigin,
  mapBlendOpacity,
  mapDevStatus,
  syncRelativeTransformTranslation,
  mapCornerRadii,
  mapEffects,
  mapEffectsPreservingEmpty,
  mapLayoutSelf,
  mapPaints,
  mapStrokeExtras,
  optNum,
  optStr,
  mapStyleId,
  prop,
  str,
  bool,
} from './propertyMappers.js';
import { buildNodeIdMapByComponentId } from './componentNodeIdMap.js';
import {
  mapArcData,
  mapBoundVariables,
  mapComponentProperties,
  mapComponentPropertyDefinitions,
  mapComponentPropertyReferences,
  mapExplicitVariableModes,
  mapFrameLayout,
  mapIndividualStrokes,
  applyInstanceShellOverridesFromFigmaApi,
  mapInstanceOverrides,
  mapLayoutExtras,
  mapPaintsExtended,
  mapPaintsPreservingEmpty,
  mapTypography,
  reportUnmappedProperties,
} from './importNodeMappers.js';
import { normalizeSourceFigmaId } from '../render/instanceMerge.js';

const SUPPORTED_SCENE_TYPES = new Set([
  'FRAME',
  'TEXT',
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'POLYGON',
  'STAR',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'GROUP',
  'TRANSFORM_GROUP',
  'SECTION',
  'SLICE',
  'COMPONENT',
  'INSTANCE',
]);

/** Placeholder when import cannot resolve an instance main component on the first DFS pass. */
export const UNRESOLVED_MAIN_COMPONENT_ID = 'I0';

interface DeferredInstanceMainComponent {
  inst: InstanceNode;
  figmaMainComponentId?: string;
  componentKey?: string;
  componentProperties?: Record<string, ComponentPropertyValue>;
}

interface ImportContext {
  idMap: FigmaIdMap;
  imageRemap: (h: string) => string | undefined;
  iconExportRemap: (figmaNodeId: string) => string | undefined;
  report: ImportReport;
  /** COMPONENT master frames keyed by component HFC id */
  componentRootFrames: Map<string, FrameNode>;
  /** COMPONENT scene wrappers for masters page lookup (variants under sets, etc.). */
  componentSceneNodes: Map<string, ComponentNode>;
  /** Figma `key` → HFC component id */
  componentByKey: Map<string, string>;
  /** Variant display name (e.g. `Property 1=Coffee, Property 2=6`) → HFC component ids (many files reuse names). */
  componentByVariantName: Map<string, string[]>;
  /** Instances imported before their COMPONENT; linked after the full tree is in idMap. */
  deferredInstances: DeferredInstanceMainComponent[];
}

const SKIP_SCENE_TYPES = new Set([
  'CONNECTOR',
  'STICKY',
  'SHAPE_WITH_TEXT',
  'CODE_BLOCK',
  'WIDGET',
  'EMBED',
  'LINK_UNFURL',
  'MEDIA',
  'SLIDE',
  'HIGHLIGHT',
  'WASHI_TAPE',
  'STAMP',
  'TEXT_PATH',
  'TABLE_CELL',
]);

export interface ImportResult {
  envelope: FileEnvelope;
  assetBuffers: {
    buf: Buffer;
    mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml';
  }[];
  report: ImportReport;
  /** Figma node/variable/style ids from the snapshot → ids stored in the envelope. */
  figmaToHfc: Record<string, string>;
}

function isFigmaNodeIconAsset(
  asset: SerializedAsset
): asset is Extract<SerializedAsset, { figmaNodeId: string }> {
  return 'figmaNodeId' in asset;
}

/**
 * Snapshot-only properties `hfcIconSvgAsset` / `hfcIconPngAsset` hold a **Figma node id**
 * (the canonical export root), not an HFC `I…` id or a content hash. Import looks up that id
 * in `figmaNodeIconToSha` built from `assets[].figmaNodeId`, then stores `iconSvgAssetHash`
 * (SHA-256) on the HFC node.
 */
function mapIconExportFromSnapshot(
  p: Record<string, unknown>,
  iconExportRemap: (figmaNodeId: string) => string | undefined
): { iconSvgAssetHash?: string } {
  const figmaNodeId =
    optStr(prop(p, 'hfcIconSvgAsset')) ?? optStr(prop(p, 'hfcIconPngAsset'));
  if (!figmaNodeId) return {};
  const hash = iconExportRemap(figmaNodeId);
  return hash ? { iconSvgAssetHash: hash } : {};
}

export function slugHfcFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 200) || 'Untitled';
}

export function importFigmaPluginSnapshot(
  snapshot: FigmaPluginSnapshot,
  params: { fileName: string }
): ImportResult {
  const report = createImportReport();
  const idMap = new FigmaIdMap(3);
  const figmaImageToSha = new Map<string, string>();
  const figmaNodeIconToSha = new Map<string, string>();
  const assetBuffers: ImportResult['assetBuffers'] = [];

  for (const asset of snapshot.assets) {
    const buf = Buffer.from(asset.base64, 'base64');
    const sha256 = createHash('sha256').update(buf).digest('hex');
    if (isFigmaNodeIconAsset(asset)) {
      figmaNodeIconToSha.set(asset.figmaNodeId, sha256);
    } else {
      figmaImageToSha.set(asset.figmaImageHash, sha256);
    }
    assetBuffers.push({ buf, mime: asset.mimeType });
  }

  const imageRemap = (figmaHash: string) => figmaImageToSha.get(figmaHash);
  const iconExportRemap = (figmaNodeId: string) => figmaNodeIconToSha.get(figmaNodeId);
  const ctx: ImportContext = {
    idMap,
    imageRemap,
    iconExportRemap,
    report,
    componentRootFrames: new Map(),
    componentSceneNodes: new Map(),
    componentByKey: new Map(),
    componentByVariantName: new Map(),
    deferredInstances: [],
  };

  const variableCollections = mapVariableCollections(snapshot, idMap);
  const textStyles = mapTextStyles(snapshot, idMap);
  const paintStyles = mapPaintStyles(snapshot, idMap, imageRemap);
  const effectStyles = mapEffectStyles(snapshot, idMap);
  const gridStyles = mapGridStyles(snapshot, idMap);

  const docId = idMap.allocate(snapshot.document.id);
  const document: DocumentNode = {
    id: docId,
    type: 'DOCUMENT',
    name: snapshot.document.name,
    sourceFigmaId: snapshot.document.id,
    children: [],
  };

  for (const pageNode of snapshot.document.children ?? []) {
    if (pageNode.type !== 'PAGE') {
      report.skippedNodes.push({
        figmaId: pageNode.id,
        type: pageNode.type,
        reason: 'expected PAGE under DOCUMENT',
      });
      continue;
    }
    document.children.push(importPage(pageNode, ctx));
  }

  linkDeferredInstanceMainComponents(ctx);

  attachComponentMasterRoots(document, ctx.componentRootFrames, ctx.componentSceneNodes, idMap);

  const envelope: FileEnvelope = {
    schemaVersion: 1,
    fileKey: ulid(),
    fileName: params.fileName,
    nextInternalId: idMap.nextInternalId,
    document,
    variableCollections: variableCollections.length > 0 ? variableCollections : undefined,
    textStyles: textStyles.length > 0 ? textStyles : undefined,
    paintStyles: paintStyles.length > 0 ? paintStyles : undefined,
    effectStyles: effectStyles.length > 0 ? effectStyles : undefined,
    gridStyles: gridStyles.length > 0 ? gridStyles : undefined,
  };

  if (importVerbose()) {
    if (report.skippedNodes.length > 0) {
      console.warn('[hfc-import] skipped nodes:', report.skippedNodes.length);
    }
    if (report.skippedProperties.length > 0) {
      console.warn('[hfc-import] unmapped properties:', report.skippedProperties.length);
    }
  }

  return { envelope, assetBuffers, report, figmaToHfc: idMap.toFigmaToHfcRecord() };
}

function importPage(node: SerializedNode, ctx: ImportContext): PageNode {
  const b = boundsFromProps(node.properties);
  const pageOrigin = containerChildPageOrigin(undefined, b, 'PAGE');
  const page: PageNode = {
    id: ctx.idMap.allocate(node.id),
    type: 'PAGE',
    name: node.name,
    sourceFigmaId: node.id,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    children: [],
    ...mapBlendOpacity(node.properties),
    backgrounds: mapPaints(prop(node.properties, 'backgrounds'), ctx.imageRemap),
  };
  const divider = prop(node.properties, 'isPageDivider');
  if (divider === true) page.isPageDivider = true;
  for (const child of node.children ?? []) {
    const imported = importSceneNode(child, ctx, pageOrigin);
    if (imported) page.children.push(imported);
  }
  return page;
}

function attachComponentMasterRoots(
  document: DocumentNode,
  componentRootFrames: Map<string, FrameNode>,
  componentSceneNodes: Map<string, ComponentNode>,
  idMap: FigmaIdMap
): void {
  if (componentRootFrames.size === 0 && componentSceneNodes.size === 0) return;

  let mastersPage = document.children.find((p) => p.name === COMPONENT_MASTERS_PAGE_NAME);
  if (!mastersPage) {
    mastersPage = {
      id: idMap.allocate('__hfc:component-masters-page'),
      type: 'PAGE',
      name: COMPONENT_MASTERS_PAGE_NAME,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      children: [],
    };
    document.children.push(mastersPage);
  }

  for (const comp of componentSceneNodes.values()) {
    mastersPage.children.push(comp);
  }
  for (const root of componentRootFrames.values()) {
    mastersPage.children.push(root);
  }
}

function registerComponentLookup(
  ctx: ImportContext,
  compId: string,
  nodeName: string,
  props: Record<string, unknown>
): void {
  const existing = ctx.componentByVariantName.get(nodeName) ?? [];
  if (!existing.includes(compId)) existing.push(compId);
  ctx.componentByVariantName.set(nodeName, existing);
  const key = optStr(prop(props, 'componentKey')) ?? optStr(prop(props, 'key'));
  if (key) ctx.componentByKey.set(key, compId);
}

function sceneSubtreeChildren(node: SceneNode): SceneNode[] {
  if (
    node.type === 'FRAME' ||
    node.type === 'GROUP' ||
    node.type === 'TRANSFORM_GROUP' ||
    node.type === 'SECTION'
  ) {
    return node.children;
  }
  if (node.type === 'BOOLEAN_OPERATION') {
    return node.children as unknown as SceneNode[];
  }
  return [];
}

/** Index every layer in component masters by leaf {@link normalizeSourceFigmaId} (instance-merge parity). */
function buildComponentByChildKeyIndex(ctx: ImportContext): Map<string, string> {
  const componentByChildKey = new Map<string, string>();
  const ambiguous = new Set<string>();
  for (const [compId, rootFrame] of ctx.componentRootFrames) {
    const stack: SceneNode[] = [rootFrame];
    while (stack.length) {
      const node = stack.pop()!;
      const key = normalizeSourceFigmaId(node.sourceFigmaId);
      if (key) {
        const existing = componentByChildKey.get(key);
        if (existing === undefined) componentByChildKey.set(key, compId);
        else if (existing !== compId) ambiguous.add(key);
      }
      for (const ch of sceneSubtreeChildren(node)) stack.push(ch);
    }
  }
  for (const key of ambiguous) componentByChildKey.delete(key);
  return componentByChildKey;
}

function collectDetachedSubtreeFigmaKeys(inst: InstanceNode): string[] {
  const keys: string[] = [];
  const stack: SceneNode[] = [...(inst.children ?? [])];
  while (stack.length) {
    const node = stack.pop()!;
    const key = normalizeSourceFigmaId(node.sourceFigmaId);
    if (key) keys.push(key);
    for (const ch of sceneSubtreeChildren(node)) stack.push(ch);
  }
  return keys;
}

function resolveMainComponentFromDetachedChildren(
  inst: InstanceNode,
  componentByChildKey: Map<string, string>
): string | undefined {
  const votes = new Map<string, number>();
  for (const key of collectDetachedSubtreeFigmaKeys(inst)) {
    const compId = componentByChildKey.get(key);
    if (!compId) continue;
    votes.set(compId, (votes.get(compId) ?? 0) + 1);
  }
  if (votes.size === 0) return undefined;
  let bestId: string | undefined;
  let bestCount = 0;
  for (const [compId, count] of votes) {
    if (count > bestCount) {
      bestCount = count;
      bestId = compId;
    }
  }
  const tied = [...votes.values()].filter((c) => c === bestCount).length;
  return tied === 1 ? bestId : undefined;
}

/** Figma variant component names: `Property 1=Coffee, Property 2=6`. */
function variantDisplayNameFromProperties(
  props: Record<string, ComponentPropertyValue> | undefined
): string | undefined {
  if (!props) return undefined;
  const parts: string[] = [];
  for (const [key, val] of Object.entries(props)) {
    if (val.type === 'VARIANT') parts.push(`${key}=${val.value}`);
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function extractInstanceMainComponentHints(
  p: Record<string, unknown>
): Pick<DeferredInstanceMainComponent, 'figmaMainComponentId' | 'componentKey'> {
  const explicitFigmaId = optStr(prop(p, 'mainComponentId'));
  const mainRef = prop(p, 'mainComponent') as
    | { id?: string; key?: string; __ref?: string }
    | string
    | undefined;

  let figmaMainComponentId = explicitFigmaId;
  let componentKey: string | undefined;

  if (typeof mainRef === 'string') {
    figmaMainComponentId ??= mainRef;
  } else if (mainRef && typeof mainRef === 'object' && mainRef.__ref !== 'cycle') {
    if (typeof mainRef.id === 'string') {
      figmaMainComponentId ??= mainRef.id;
    }
    if (typeof mainRef.key === 'string') {
      componentKey = mainRef.key;
    }
  }

  return { figmaMainComponentId, componentKey };
}

type ResolveMainComponentOptions = {
  /** When false, variant display names are ignored (import-time pass). */
  allowVariantNameFallback?: boolean;
};

function resolveMainComponentIdFromHints(
  ctx: ImportContext,
  hints: Pick<DeferredInstanceMainComponent, 'figmaMainComponentId' | 'componentKey' | 'componentProperties'>,
  options: ResolveMainComponentOptions = {}
): string | undefined {
  if (hints.figmaMainComponentId) {
    const mapped = ctx.idMap.get(hints.figmaMainComponentId);
    if (mapped) return mapped;
  }

  if (hints.componentKey) {
    const byKey = ctx.componentByKey.get(hints.componentKey);
    if (byKey) return byKey;
  }

  if (options.allowVariantNameFallback) {
    const variantName = variantDisplayNameFromProperties(hints.componentProperties);
    if (variantName) {
      const candidates = ctx.componentByVariantName.get(variantName);
      if (candidates?.length === 1) return candidates[0];
    }
  }

  return undefined;
}

function linkDeferredInstanceMainComponents(ctx: ImportContext): void {
  const componentByChildKey = buildComponentByChildKeyIndex(ctx);
  for (const entry of ctx.deferredInstances) {
    let resolved = resolveMainComponentIdFromHints(ctx, entry, { allowVariantNameFallback: true });
    if (!resolved) {
      resolved = resolveMainComponentFromDetachedChildren(entry.inst, componentByChildKey);
    }
    if (resolved && ctx.componentRootFrames.has(resolved)) {
      entry.inst.mainComponentId = resolved;
    }
  }
  ctx.deferredInstances.length = 0;
}

function importSceneNode(
  node: SerializedNode,
  ctx: ImportContext,
  parentPageOrigin?: ParentPageOrigin
): SceneNode | null {
  const { idMap, imageRemap, report } = ctx;

  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'TABLE') {
    const p = node.properties;
    reportUnmappedProperties(node.id, p, report);
    const b = boundsFromProps(p, parentPageOrigin);
    const base = {
      id: idMap.allocate(node.id),
      name: node.name,
      sourceFigmaId: node.id,
      ...syncRelativeTransformTranslation(mapBlendOpacity(p), b.x, b.y),
      ...mapLayoutSelf(p),
      ...mapIconExportFromSnapshot(p, ctx.iconExportRemap),
    };
    const nodePageOrigin = containerChildPageOrigin(parentPageOrigin, b, node.type);
    const importChildren = (): SceneNode[] => {
      const kids: SceneNode[] = [];
      for (const c of node.children ?? []) {
        const n = importSceneNode(c, ctx, nodePageOrigin);
        if (n) kids.push(n);
      }
      return kids;
    };
    if (node.type === 'COMPONENT') {
      const compId = base.id;
      const rootFrameId = idMap.allocate(`${node.id}:root`);
      const rootFrame = buildFrameFromSerialized(node, rootFrameId, ctx, importChildren(), {
        x: 0,
        y: 0,
        width: b.width,
        height: b.height,
      });
      ctx.componentRootFrames.set(compId, rootFrame);
      registerComponentLookup(ctx, compId, node.name, p);
      const componentKey = optStr(prop(p, 'componentKey')) ?? optStr(prop(p, 'key'));
      const defs = mapComponentPropertyDefinitions(prop(p, 'componentPropertyDefinitions'));
      const componentNode: ComponentNode = {
        ...base,
        type: 'COMPONENT',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        rootFrameId,
        ...(componentKey ? { componentKey } : {}),
        ...(defs ? { componentPropertyDefinitions: defs } : {}),
      };
      ctx.componentSceneNodes.set(compId, componentNode);
      return componentNode as SceneNode;
    }
    if (node.type === 'COMPONENT_SET') {
      const componentIds: string[] = [];
      const variantOptions: string[] = [];
      for (const c of node.children ?? []) {
        if (c.type !== 'COMPONENT') continue;
        const childProps = c.properties;
        const compId = idMap.get(c.id) ?? idMap.allocate(c.id);
        componentIds.push(compId);
        registerComponentLookup(ctx, compId, c.name, childProps);
        const rootFrameId = idMap.allocate(`${c.id}:root`);
        const childBounds = boundsFromProps(childProps, nodePageOrigin);
        const childKids: SceneNode[] = [];
        const variantPageOrigin = containerChildPageOrigin(nodePageOrigin, childBounds, 'COMPONENT');
        for (const gc of c.children ?? []) {
          const n = importSceneNode(gc, ctx, variantPageOrigin);
          if (n) childKids.push(n);
        }
        const rootFrame = buildFrameFromSerialized(c, rootFrameId, ctx, childKids, {
          x: 0,
          y: 0,
          width: childBounds.width,
          height: childBounds.height,
        });
        ctx.componentRootFrames.set(compId, rootFrame);
        ctx.componentSceneNodes.set(compId, {
          id: compId,
          type: 'COMPONENT',
          name: c.name,
          sourceFigmaId: c.id,
          x: 0,
          y: 0,
          width: childBounds.width,
          height: childBounds.height,
          rootFrameId,
          ...(optStr(prop(childProps, 'componentKey')) ?? optStr(prop(childProps, 'key'))
            ? { componentKey: optStr(prop(childProps, 'componentKey')) ?? optStr(prop(childProps, 'key')) }
            : {}),
        });
        variantOptions.push(c.name);
      }
      const defs = mapComponentPropertyDefinitions(prop(p, 'componentPropertyDefinitions'));
      let variantPropertyKey: string | undefined;
      if (defs) {
        for (const [key, def] of Object.entries(defs)) {
          if (def.type === 'VARIANT') {
            variantPropertyKey = key;
            if (def.variantOptions.length > 0) {
              variantOptions.length = 0;
              variantOptions.push(...def.variantOptions);
            }
            break;
          }
        }
      }
      const baseComponentId = componentIds[0];
      const nodeIdMapByComponentId = buildNodeIdMapByComponentId(
        ctx.componentRootFrames,
        componentIds,
        baseComponentId
      );
      return {
        ...base,
        type: 'COMPONENT_SET',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        componentIds,
        variantPropertyKey,
        variantOptions: variantOptions.length > 0 ? variantOptions : undefined,
        baseComponentId,
        ...(nodeIdMapByComponentId ? { nodeIdMapByComponentId } : {}),
        ...(optStr(prop(p, 'componentKey')) ?? optStr(prop(p, 'key'))
          ? { componentKey: optStr(prop(p, 'componentKey')) ?? optStr(prop(p, 'key')) }
          : {}),
        ...(defs ? { componentPropertyDefinitions: defs } : {}),
      } as ComponentSetNode;
    }
    report.skippedNodes.push({
      figmaId: node.id,
      type: node.type,
      reason: 'imported as FRAME placeholder',
    });
    if (importStrict()) return null;
    return buildFrameFromSerialized(node, idMap.allocate(node.id), ctx, importChildren(), b) as SceneNode;
  }

  if (SKIP_SCENE_TYPES.has(node.type)) {
    report.skippedNodes.push({ figmaId: node.id, type: node.type, reason: 'unsupported type' });
    return null;
  }
  if (!SUPPORTED_SCENE_TYPES.has(node.type)) {
    report.skippedNodes.push({ figmaId: node.id, type: node.type, reason: 'unknown type' });
    if (importStrict()) {
      throw new Error(`HFC_IMPORT_STRICT: unsupported node type ${node.type}`);
    }
    return null;
  }

  const p = node.properties;
  reportUnmappedProperties(node.id, p, report);
  const b = boundsFromProps(p, parentPageOrigin);
  const base = {
    id: idMap.allocate(node.id),
    name: node.name,
    sourceFigmaId: node.id,
    ...syncRelativeTransformTranslation(mapBlendOpacity(p), b.x, b.y),
    ...mapLayoutSelf(p),
    ...mapLayoutExtras(p),
    ...mapIconExportFromSnapshot(p, ctx.iconExportRemap),
    ...(mapBoundVariables(p, idMap) ? { boundVariables: mapBoundVariables(p, idMap) } : {}),
    ...(mapExplicitVariableModes(p, idMap) ? { explicitVariableModes: mapExplicitVariableModes(p, idMap) } : {}),
    ...(mapComponentPropertyReferences(prop(p, 'componentPropertyReferences'))
      ? { componentPropertyReferences: mapComponentPropertyReferences(prop(p, 'componentPropertyReferences')) }
      : {}),
  };
  const nodePageOrigin = containerChildPageOrigin(parentPageOrigin, b, node.type);
  const fills = mapPaintsExtended(prop(p, 'fills'), imageRemap, idMap);
  const strokes = mapPaintsExtended(prop(p, 'strokes'), imageRemap, idMap);
  const effects = mapEffects(prop(p, 'effects'));
  const strokeExtras = mapStrokeExtras(p);
  const corners = mapCornerRadii(p);

  const importChildren = (): SceneNode[] => {
    const kids: SceneNode[] = [];
    for (const c of node.children ?? []) {
      const n = importSceneNode(c, ctx, nodePageOrigin);
      if (n) kids.push(n);
    }
    return kids;
  };

  switch (node.type) {
    case 'FRAME': {
      return {
        ...base,
        type: 'FRAME',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
        fills,
        backgrounds: mapPaintsExtended(prop(p, 'backgrounds'), imageRemap, idMap),
        strokes,
        effects,
        ...strokeExtras,
        ...corners,
        ...mapIndividualStrokes(p),
        ...mapFrameLayout(p, b.width),
        clipsContent: prop(p, 'clipsContent') === true,
        layoutMode: optStr(prop(p, 'layoutMode')) as 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID' | undefined,
        fillStyleId: mapStyleId(idMap, prop(p, 'fillStyleId')),
        strokeStyleId: mapStyleId(idMap, prop(p, 'strokeStyleId')),
        effectStyleId: mapStyleId(idMap, prop(p, 'effectStyleId')),
        gridStyleId: mapStyleId(idMap, prop(p, 'gridStyleId')),
      } as SceneNode;
    }
    case 'TEXT': {
      const characters = str(prop(p, 'characters'), ' ');
      const fontName = prop(p, 'fontName') as { family?: string; style?: string } | undefined;
      return {
        ...base,
        type: 'TEXT',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        characters,
        fills,
        strokes,
        effects,
        ...strokeExtras,
        fontSize: optNum(prop(p, 'fontSize')),
        fontWeight: optNum(prop(p, 'fontWeight')),
        fontName:
          fontName && typeof fontName.family === 'string' && typeof fontName.style === 'string'
            ? { family: fontName.family, style: fontName.style }
            : undefined,
        textAlignHorizontal: optStr(prop(p, 'textAlignHorizontal')) as 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED' | undefined,
        textAlignVertical: optStr(prop(p, 'textAlignVertical')) as 'TOP' | 'CENTER' | 'BOTTOM' | undefined,
        textAutoResize: optStr(prop(p, 'textAutoResize')) as 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE' | undefined,
        textStyleId: mapStyleId(idMap, prop(p, 'textStyleId')),
        fillStyleId: mapStyleId(idMap, prop(p, 'fillStyleId')),
        ...mapTypography(p),
      } as SceneNode;
    }
    case 'RECTANGLE':
    case 'LINE':
    case 'POLYGON':
    case 'STAR': {
      return {
        ...base,
        type: node.type,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fills,
        strokes,
        effects,
        ...strokeExtras,
        ...corners,
        ...mapIndividualStrokes(p),
        fillStyleId: mapStyleId(idMap, prop(p, 'fillStyleId')),
        strokeStyleId: mapStyleId(idMap, prop(p, 'strokeStyleId')),
        effectStyleId: mapStyleId(idMap, prop(p, 'effectStyleId')),
      } as SceneNode;
    }
    case 'ELLIPSE': {
      return {
        ...base,
        type: 'ELLIPSE',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fills,
        strokes,
        effects,
        ...strokeExtras,
        ...corners,
        ...mapIndividualStrokes(p),
        ...mapArcData(p),
        fillStyleId: mapStyleId(idMap, prop(p, 'fillStyleId')),
        strokeStyleId: mapStyleId(idMap, prop(p, 'strokeStyleId')),
        effectStyleId: mapStyleId(idMap, prop(p, 'effectStyleId')),
      } as SceneNode;
    }
    case 'VECTOR': {
      const vectorPaths = prop(p, 'vectorPaths');
      return {
        ...base,
        type: 'VECTOR',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        fills,
        strokes,
        effects,
        ...strokeExtras,
        vectorPaths: Array.isArray(vectorPaths) ? vectorPaths : [],
        fillStyleId: mapStyleId(idMap, prop(p, 'fillStyleId')),
      } as SceneNode;
    }
    case 'BOOLEAN_OPERATION': {
      return {
        ...base,
        type: 'BOOLEAN_OPERATION',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
        fills,
        strokes,
        effects,
        ...strokeExtras,
        booleanOperation: (optStr(prop(p, 'booleanOperation')) ?? 'UNION') as 'UNION' | 'INTERSECT' | 'SUBTRACT' | 'EXCLUDE',
      } as SceneNode;
    }
    case 'GROUP': {
      return {
        ...base,
        type: 'GROUP' as const,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
      };
    }
    case 'TRANSFORM_GROUP': {
      return {
        ...base,
        type: 'TRANSFORM_GROUP',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
      } as SceneNode;
    }
    case 'SECTION': {
      const sectionContentsHidden = bool(prop(p, 'sectionContentsHidden'));
      return {
        ...base,
        type: 'SECTION',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
        fills,
        strokes,
        ...strokeExtras,
        ...mapDevStatus(p),
        ...(sectionContentsHidden !== undefined ? { sectionContentsHidden } : {}),
      } as SceneNode;
    }
    case 'SLICE': {
      return {
        ...base,
        type: 'SLICE',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      } as SceneNode;
    }
    case 'INSTANCE': {
      const componentProperties = mapComponentProperties(prop(p, 'componentProperties'), idMap);
      const mainHints = extractInstanceMainComponentHints(p);
      const hints = { ...mainHints, componentProperties };
      const mainComponentId = resolveMainComponentIdFromHints(ctx, hints, {
        allowVariantNameFallback: false,
      });
      const pendingFigmaMainComponent =
        mainHints.figmaMainComponentId !== undefined &&
        ctx.idMap.get(mainHints.figmaMainComponentId) === undefined;
      const shouldDefer =
        pendingFigmaMainComponent ||
        (!mainComponentId &&
          (mainHints.figmaMainComponentId || mainHints.componentKey || componentProperties));
      if (!mainComponentId && !shouldDefer && importStrict()) {
        throw new Error(`HFC_IMPORT_STRICT: INSTANCE ${node.id} missing mainComponent`);
      }
      const instanceAppearance: Partial<InstanceNode> = {};
      if (Object.prototype.hasOwnProperty.call(p, 'fills')) {
        instanceAppearance.fills = mapPaintsPreservingEmpty(prop(p, 'fills'), imageRemap, idMap);
      }
      if (Object.prototype.hasOwnProperty.call(p, 'strokes')) {
        instanceAppearance.strokes = mapPaintsPreservingEmpty(prop(p, 'strokes'), imageRemap, idMap);
      }
      if (Object.prototype.hasOwnProperty.call(p, 'backgrounds')) {
        instanceAppearance.backgrounds = mapPaintsPreservingEmpty(prop(p, 'backgrounds'), imageRemap, idMap);
      }
      if (Object.prototype.hasOwnProperty.call(p, 'effects')) {
        instanceAppearance.effects = mapEffectsPreservingEmpty(prop(p, 'effects'));
      }
      if (Object.prototype.hasOwnProperty.call(p, 'fillStyleId')) {
        instanceAppearance.fillStyleId = mapStyleId(idMap, prop(p, 'fillStyleId'));
      }
      if (Object.prototype.hasOwnProperty.call(p, 'strokeStyleId')) {
        instanceAppearance.strokeStyleId = mapStyleId(idMap, prop(p, 'strokeStyleId'));
      }
      if (Object.prototype.hasOwnProperty.call(p, 'effectStyleId')) {
        instanceAppearance.effectStyleId = mapStyleId(idMap, prop(p, 'effectStyleId'));
      }
      if (Object.prototype.hasOwnProperty.call(p, 'boundVariables')) {
        instanceAppearance.boundVariables = mapBoundVariables(p, idMap) ?? {};
      }
      if (prop(p, 'clipsContent') === true) {
        instanceAppearance.clipsContent = true;
      } else if (Object.prototype.hasOwnProperty.call(p, 'clipsContent')) {
        instanceAppearance.clipsContent = false;
      }
      applyInstanceShellOverridesFromFigmaApi(instanceAppearance, node.id, p, imageRemap, idMap);
      const inst = {
        ...base,
        type: 'INSTANCE',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
        ...instanceAppearance,
        ...strokeExtras,
        ...mapIndividualStrokes(p),
        ...corners,
        mainComponentId: mainComponentId ?? UNRESOLVED_MAIN_COMPONENT_ID,
        componentProperties,
        overrides: mapInstanceOverrides(prop(p, 'overrides'), idMap, imageRemap),
        ...(optNum(prop(p, 'scaleFactor')) !== undefined ? { scaleFactor: optNum(prop(p, 'scaleFactor')) } : {}),
      } as InstanceNode;
      if (importDebug()) {
        const shellFields = ['fills', 'strokes', 'backgrounds', 'effects'] as const;
        const propsKeys = shellFields.filter((f) => Object.prototype.hasOwnProperty.call(p, f));
        const hfcKeys = shellFields.filter((f) => Object.prototype.hasOwnProperty.call(inst, f));
        if (propsKeys.length > 0 || Object.prototype.hasOwnProperty.call(p, 'overrides')) {
          console.warn(
            `[instance-import] ${node.id} snapshotProps=[${propsKeys.join(',')}] hfcKeys=[${hfcKeys.join(',')}] ` +
              `fills=${Object.prototype.hasOwnProperty.call(inst, 'fills') ? JSON.stringify(inst.fills) : 'absent'}`
          );
        }
      }
      if (shouldDefer) {
        if (importVerbose()) {
          const variantName = variantDisplayNameFromProperties(componentProperties);
          console.warn(
            `[hfc-import] deferred mainComponent for INSTANCE ${node.id}` +
              (variantName ? ` (variant ${variantName})` : '')
          );
        }
        ctx.deferredInstances.push({
          inst,
          ...mainHints,
          componentProperties,
        });
      } else if (!mainComponentId && importVerbose()) {
        console.warn(`[hfc-import] unresolved mainComponent for INSTANCE ${node.id} (no export hints)`);
      }
      return inst;
    }
    default:
      return null;
  }
}

function buildFrameFromSerialized(
  node: SerializedNode,
  frameId: string,
  ctx: ImportContext,
  children: SceneNode[],
  boundsOverride?: { x: number; y: number; width: number; height: number }
): FrameNode {
  const p = node.properties;
  const b = boundsOverride ?? boundsFromProps(p);
  const { imageRemap, idMap } = ctx;
  return {
    id: frameId,
    type: 'FRAME',
    name: node.name,
    sourceFigmaId: node.id,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    children,
    ...mapBlendOpacity(p),
    ...mapLayoutSelf(p),
    ...mapLayoutExtras(p),
    fills: mapPaintsExtended(prop(p, 'fills'), imageRemap, idMap),
    backgrounds: mapPaintsExtended(prop(p, 'backgrounds'), imageRemap, idMap),
    strokes: mapPaintsExtended(prop(p, 'strokes'), imageRemap, idMap),
    effects: mapEffects(prop(p, 'effects')),
    ...mapStrokeExtras(p),
    ...mapCornerRadii(p),
    clipsContent: prop(p, 'clipsContent') === true,
  };
}

function mapVariableCollections(snapshot: FigmaPluginSnapshot, idMap: FigmaIdMap): VariableCollection[] {
  const out: VariableCollection[] = [];
  for (const raw of snapshot.variableCollections) {
    const figmaId = str(raw.id);
    const name = str(raw.name, 'Collection');
    const modes = Array.isArray(raw.modes)
      ? (raw.modes as { id: string; name: string }[]).map((m) => ({
          id: idMap.allocate(m.id),
          name: str(m.name, 'Mode'),
        }))
      : [];
    const defaultModeId =
      typeof raw.defaultModeId === 'string' ? idMap.allocate(raw.defaultModeId) : modes[0]?.id ?? 'VM1';
    const variables: VariableDefinition[] = [];
    const varIds = raw.variableIds;
    if (Array.isArray(varIds)) {
      for (const vid of varIds) {
        const v = typeof vid === 'string' ? null : (vid as Record<string, unknown>);
        if (!v && typeof vid === 'string') continue;
      }
    }
    if (Array.isArray(raw.variables)) {
      for (const v of raw.variables as Record<string, unknown>[]) {
        const resolvedType = v.resolvedType;
        if (resolvedType !== 'COLOR' && resolvedType !== 'FLOAT' && resolvedType !== 'STRING') continue;
        const valuesByMode: VariableDefinition['valuesByMode'] = {};
        const vbm = v.valuesByMode as Record<string, unknown> | undefined;
        if (vbm) {
          for (const [modeId, val] of Object.entries(vbm)) {
            const hfcMode = idMap.get(modeId) ?? idMap.allocate(modeId);
            if (resolvedType === 'COLOR' && val && typeof val === 'object') {
              const color = (val as Record<string, unknown>).r !== undefined ? val : (val as { color?: unknown }).color;
              const rgb = color as { r: number; g: number; b: number };
              if (typeof rgb.r === 'number') {
                valuesByMode[hfcMode] = { type: 'COLOR', color: { r: rgb.r, g: rgb.g, b: rgb.b } };
              }
            } else if (resolvedType === 'FLOAT' && typeof val === 'number') {
              valuesByMode[hfcMode] = { type: 'FLOAT', value: val };
            } else if (resolvedType === 'STRING' && typeof val === 'string') {
              valuesByMode[hfcMode] = { type: 'STRING', value: val };
            }
          }
        }
        variables.push({
          id: idMap.allocate(str(v.id)),
          name: str(v.name),
          resolvedType,
          valuesByMode,
        });
      }
    }
    out.push({
      id: idMap.allocate(figmaId),
      name,
      defaultModeId,
      modes: modes.length > 0 ? modes : [{ id: defaultModeId, name: 'Default' }],
      variables,
    });
  }
  return out;
}

function mapFontNameFromRaw(raw: Record<string, unknown>): FontName | undefined {
  const fontName = raw.fontName as { family?: string; style?: string } | undefined;
  if (fontName && typeof fontName.family === 'string' && typeof fontName.style === 'string') {
    return { family: fontName.family, style: fontName.style };
  }
  return undefined;
}

function mapTextStyles(snapshot: FigmaPluginSnapshot, idMap: FigmaIdMap): TextStyleDefinition[] {
  return snapshot.textStyles.map((raw) => {
    const r = raw as Record<string, unknown>;
    const typo = mapTypography(r);
    const bv = mapBoundVariables(r, idMap);
    return {
      id: idMap.allocate(str(r.id)),
      name: str(r.name),
      ...typo,
      fontName: mapFontNameFromRaw(r),
      fontSize: optNum(r.fontSize),
      fontWeight: optNum(r.fontWeight),
      fills: mapPaints(r.fills, () => undefined),
      ...(bv ? { boundVariables: bv as TextVariableBindings } : {}),
    };
  });
}

function mapPaintStyles(
  snapshot: FigmaPluginSnapshot,
  idMap: FigmaIdMap,
  imageRemap: (h: string) => string | undefined
): PaintStyleDefinition[] {
  return snapshot.paintStyles.map((raw) => {
    const r = raw as Record<string, unknown>;
    let boundVariables: PaintStyleDefinition['boundVariables'];
    const rawBv = r.boundVariables as { color?: unknown } | undefined;
    if (rawBv?.color && Array.isArray(rawBv.color)) {
      const color: string[] = [];
      for (const item of rawBv.color) {
        if (item && typeof item === 'object' && (item as { type?: string; id?: string }).type === 'VARIABLE_ALIAS') {
          const vid = (item as { id?: string }).id;
          if (typeof vid === 'string') color.push(idMap.allocate(vid));
        }
      }
      if (color.length) boundVariables = { color };
    }
    return {
      id: idMap.allocate(str(r.id)),
      name: str(r.name),
      paints: mapPaints(r.paints, imageRemap) ?? [],
      ...(boundVariables ? { boundVariables } : {}),
    };
  });
}

function mapEffectStyles(snapshot: FigmaPluginSnapshot, idMap: FigmaIdMap): EffectStyleDefinition[] {
  return snapshot.effectStyles.map((raw) => ({
    id: idMap.allocate(str(raw.id)),
    name: str(raw.name),
    effects: mapEffects(raw.effects) ?? [],
  }));
}

function mapGridStyles(snapshot: FigmaPluginSnapshot, idMap: FigmaIdMap): GridStyleDefinition[] {
  return snapshot.gridStyles.map((raw) => {
    const r = raw as Record<string, unknown>;
    const layoutGrids = normalizeLayoutGrids(r.layoutGrids, 360, 'gridStyle.layoutGrids') ?? [];
    return {
      id: idMap.allocate(str(r.id)),
      name: str(r.name),
      layoutGrids,
    };
  });
}
