import { createHash } from 'node:crypto';
import { ulid } from 'ulid';
import type {
  ComponentDefinition,
  DocumentNode,
  FileEnvelope,
  FrameNode,
  GroupNode,
  PageNode,
  SceneNode,
  VariableCollection,
  VariableDefinition,
  TextStyleDefinition,
  PaintStyleDefinition,
  EffectStyleDefinition,
  GridStyleDefinition,
} from '../model/types.js';
import type { FigmaPluginSnapshot, SerializedNode } from './snapshotSchema.js';
import { FigmaIdMap } from './idMap.js';
import { createImportReport, importStrict, importVerbose, type ImportReport } from './importReport.js';
import {
  boundsFromProps,
  childPageOrigin,
  type ParentPageOrigin,
  mapBlendOpacity,
  mapCornerRadii,
  mapEffects,
  mapLayoutSelf,
  mapPaints,
  mapStrokeExtras,
  optNum,
  optStr,
  prop,
  str,
} from './propertyMappers.js';
import {
  mapArcData,
  mapBoundVariables,
  mapComponentProperties,
  mapExplicitVariableModes,
  mapFrameLayout,
  mapIndividualStrokes,
  mapInstanceOverrides,
  mapLayoutExtras,
  mapPaintsExtended,
  mapTypography,
  reportUnmappedProperties,
} from './importNodeMappers.js';

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

interface ImportContext {
  idMap: FigmaIdMap;
  imageRemap: (h: string) => string | undefined;
  report: ImportReport;
  /** COMPONENT master frames keyed by component HFC id */
  componentRootFrames: Map<string, FrameNode>;
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
  assetBuffers: { buf: Buffer; mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' }[];
  report: ImportReport;
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
  const assetBuffers: ImportResult['assetBuffers'] = [];

  for (const asset of snapshot.assets) {
    const buf = Buffer.from(asset.base64, 'base64');
    const sha256 = createHash('sha256').update(buf).digest('hex');
    figmaImageToSha.set(asset.figmaImageHash, sha256);
    assetBuffers.push({ buf, mime: asset.mimeType });
  }

  const imageRemap = (figmaHash: string) => figmaImageToSha.get(figmaHash);
  const ctx: ImportContext = {
    idMap,
    imageRemap,
    report,
    componentRootFrames: new Map(),
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

  const components: ComponentDefinition[] = [];
  for (const [compId, root] of ctx.componentRootFrames) {
    const compNode = findComponentNode(document, compId);
    components.push({
      id: compId,
      name: compNode?.name ?? root.name,
      root,
    });
  }

  const envelope: FileEnvelope = {
    schemaVersion: 1,
    fileKey: ulid(),
    fileName: params.fileName,
    nextInternalId: idMap.nextInternalId,
    document,
    components: components.length > 0 ? components : undefined,
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

  return { envelope, assetBuffers, report };
}

function importPage(node: SerializedNode, ctx: ImportContext): PageNode {
  const b = boundsFromProps(node.properties);
  const pageOrigin = childPageOrigin(undefined, b);
  const page: PageNode = {
    id: ctx.idMap.allocate(node.id),
    type: 'PAGE',
    name: node.name,
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

/**
 * Figma group children are group-relative; compiler expects frame-space when using coordLocalOrigin.
 * Nested groups: normalize inner descendants first, then apply this group's offset once.
 */
function normalizeGroupChildrenToFrameSpace(g: GroupNode): void {
  for (const ch of g.children) {
    if (ch.type === 'GROUP') {
      const lx = ch.x;
      const ly = ch.y;
      normalizeGroupChildrenToFrameSpace(ch);
      for (const sub of ch.children) {
        sub.x += g.x;
        sub.y += g.y;
      }
      ch.x = g.x + lx;
      ch.y = g.y + ly;
    } else {
      ch.x += g.x;
      ch.y += g.y;
    }
  }
}

function findComponentNode(document: DocumentNode, compId: string): SceneNode | undefined {
  for (const page of document.children) {
    for (const ch of page.children) {
      if (ch.id === compId && ch.type === 'COMPONENT') return ch;
    }
  }
  return undefined;
}

function importSceneNode(
  node: SerializedNode,
  ctx: ImportContext,
  parentPageOrigin?: ParentPageOrigin,
  parentIsGroup = false
): SceneNode | null {
  const { idMap, imageRemap, report } = ctx;

  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'TABLE') {
    const p = node.properties;
    reportUnmappedProperties(node.id, p, report);
    const base = {
      id: idMap.allocate(node.id),
      name: node.name,
      ...mapBlendOpacity(p),
      ...mapLayoutSelf(p),
    };
    const b = boundsFromProps(p, parentPageOrigin);
    const nodePageOrigin = childPageOrigin(parentPageOrigin, b);
    const importChildren = (): SceneNode[] => {
      const kids: SceneNode[] = [];
      for (const c of node.children ?? []) {
        const n = importSceneNode(c, ctx, nodePageOrigin, node.type === 'GROUP');
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
      return {
        ...base,
        type: 'COMPONENT',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        rootFrameId,
      } as SceneNode;
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
  const base = {
    id: idMap.allocate(node.id),
    name: node.name,
    ...mapBlendOpacity(p),
    ...mapLayoutSelf(p),
    ...mapLayoutExtras(p),
    ...(mapBoundVariables(p, idMap) ? { boundVariables: mapBoundVariables(p, idMap) } : {}),
    ...(mapExplicitVariableModes(p, idMap) ? { explicitVariableModes: mapExplicitVariableModes(p, idMap) } : {}),
  };
  const b = boundsFromProps(p, parentPageOrigin);
  const nodePageOrigin = childPageOrigin(parentPageOrigin, b);
  const fills = mapPaintsExtended(prop(p, 'fills'), imageRemap, idMap);
  const strokes = mapPaintsExtended(prop(p, 'strokes'), imageRemap, idMap);
  const effects = mapEffects(prop(p, 'effects'));
  const strokeExtras = mapStrokeExtras(p);
  const corners = mapCornerRadii(p);

  const importChildren = (): SceneNode[] => {
    const kids: SceneNode[] = [];
    for (const c of node.children ?? []) {
      const n = importSceneNode(c, ctx, nodePageOrigin, node.type === 'GROUP');
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
        paddingLeft: optNum(prop(p, 'paddingLeft')),
        paddingRight: optNum(prop(p, 'paddingRight')),
        paddingTop: optNum(prop(p, 'paddingTop')),
        paddingBottom: optNum(prop(p, 'paddingBottom')),
        itemSpacing: optNum(prop(p, 'itemSpacing')),
        primaryAxisAlignItems: optStr(prop(p, 'primaryAxisAlignItems')) as
          | 'MIN'
          | 'CENTER'
          | 'MAX'
          | 'SPACE_BETWEEN'
          | undefined,
        counterAxisAlignItems: optStr(prop(p, 'counterAxisAlignItems')) as
          | 'MIN'
          | 'CENTER'
          | 'MAX'
          | 'BASELINE'
          | undefined,
        fillStyleId: optStr(prop(p, 'fillStyleId')),
        strokeStyleId: optStr(prop(p, 'strokeStyleId')),
        effectStyleId: optStr(prop(p, 'effectStyleId')),
        gridStyleId: optStr(prop(p, 'gridStyleId')),
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
        textStyleId: optStr(prop(p, 'textStyleId')),
        fillStyleId: optStr(prop(p, 'fillStyleId')),
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
        fillStyleId: optStr(prop(p, 'fillStyleId')),
        strokeStyleId: optStr(prop(p, 'strokeStyleId')),
        effectStyleId: optStr(prop(p, 'effectStyleId')),
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
        fillStyleId: optStr(prop(p, 'fillStyleId')),
        strokeStyleId: optStr(prop(p, 'strokeStyleId')),
        effectStyleId: optStr(prop(p, 'effectStyleId')),
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
        fillStyleId: optStr(prop(p, 'fillStyleId')),
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
      const group = {
        ...base,
        type: 'GROUP' as const,
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
      };
      if (!parentIsGroup) {
        normalizeGroupChildrenToFrameSpace(group);
      }
      return group;
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
      const mainRef = prop(p, 'mainComponent') as { id?: string } | string | undefined;
      let mainComponentId: string | undefined;
      if (typeof mainRef === 'string') {
        mainComponentId = idMap.get(mainRef);
      } else if (mainRef && typeof mainRef === 'object' && typeof mainRef.id === 'string') {
        mainComponentId = idMap.get(mainRef.id);
      }
      if (!mainComponentId && importStrict()) {
        throw new Error(`HFC_IMPORT_STRICT: INSTANCE ${node.id} missing mainComponent`);
      }
      return {
        ...base,
        type: 'INSTANCE',
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        children: importChildren(),
        fills,
        strokes,
        effects,
        ...strokeExtras,
        ...corners,
        mainComponentId: mainComponentId ?? 'I0',
        componentProperties: mapComponentProperties(prop(p, 'componentProperties')),
        overrides: mapInstanceOverrides(prop(p, 'overrides'), idMap, imageRemap),
        effectStyleId: optStr(prop(p, 'effectStyleId')),
      } as SceneNode;
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

function mapTextStyles(snapshot: FigmaPluginSnapshot, idMap: FigmaIdMap): TextStyleDefinition[] {
  return snapshot.textStyles.map((raw) => ({
    id: idMap.allocate(str(raw.id)),
    name: str(raw.name),
    fontSize: optNum(raw.fontSize),
    fontWeight: optNum(raw.fontWeight),
    fills: mapPaints(raw.fills, () => undefined),
  }));
}

function mapPaintStyles(
  snapshot: FigmaPluginSnapshot,
  idMap: FigmaIdMap,
  imageRemap: (h: string) => string | undefined
): PaintStyleDefinition[] {
  return snapshot.paintStyles.map((raw) => ({
    id: idMap.allocate(str(raw.id)),
    name: str(raw.name),
    paints: mapPaints(raw.paints, imageRemap) ?? [],
  }));
}

function mapEffectStyles(snapshot: FigmaPluginSnapshot, idMap: FigmaIdMap): EffectStyleDefinition[] {
  return snapshot.effectStyles.map((raw) => ({
    id: idMap.allocate(str(raw.id)),
    name: str(raw.name),
    effects: mapEffects(raw.effects) ?? [],
  }));
}

function mapGridStyles(snapshot: FigmaPluginSnapshot, idMap: FigmaIdMap): GridStyleDefinition[] {
  return snapshot.gridStyles.map((raw) => ({
    id: idMap.allocate(str(raw.id)),
    name: str(raw.name),
    layoutGrids: Array.isArray(raw.layoutGrids) ? (raw.layoutGrids as GridStyleDefinition['layoutGrids']) : [],
  }));
}
