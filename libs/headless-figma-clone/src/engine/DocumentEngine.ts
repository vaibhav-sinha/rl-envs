import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { ulid } from 'ulid';
import type {
  AssetRecord,
  BooleanOperationNode,
  DocumentNode,
  EllipseNode,
  FileEnvelope,
  FrameNode,
  LineNode,
  PageNode,
  PolygonNode,
  RectangleNode,
  SceneNode,
  StarNode,
  TextNode,
  TransformGroupNode,
  GroupNode,
  SliceNode,
  SectionNode,
  VectorNode,
  TableNode,
  ComponentInstanceNode,
  ComponentNode,
  ComponentSetNode,
  InstanceNode,
  ComponentPropertyValue,
  LayoutSelfFields,
  TransformModifier,
} from '../model/types.js';
import type { StyledSegment } from '../model/types.js';
import type { PersistenceService } from '../persistence/JsonPersistence.js';
import { atomicWriteFileBinary } from '../persistence/atomicWriteFile.js';
import { relativeAssetFile, sidecarDirForHfcJson } from '../persistence/assetPaths.js';
import type { Logger } from '../util/logger.js';
import type { EngineErrorCode } from '../util/errors.js';
import { ValidationErr } from '../util/errors.js';
import { applyEnvelopeOperation, isEnvelopeOperation, type EnvelopeOperation } from './envelopeOps.js';
import { normalizePathDataToOrigin } from '../render/vectorPathBounds.js';
import { normalizeLayoutGrids } from './figmaInterop.js';
import { ENGINE_MATRIX, sceneShapeTypes } from './phase-matrix.js';
import {
  applyLayoutSelfFromSpec,
  applyLayoutSelfPatch,
  validateFontName,
  validateLayoutSizing,
} from './phase7Fields.js';
import { validateEffects } from './validateEffects.js';
import { validatePaintArray } from './validatePaints.js';
import { parseStyledSegmentsInput } from './styledSegmentsNormalize.js';
import { validateStyledSegments } from './utf16Segments.js';
import { findVariableDefinition } from '../variables/resolution.js';
import type { FrameVariableBindings, TextVariableBindings } from '../model/types.js';
import { DEFAULT_FRAME_FILLS } from '../model/types.js';
import { syncBooleanOperationBounds, syncGroupBounds, translateGroupDescendants } from './graphOps.js';

export type { EngineErrorCode } from '../util/errors.js';

export interface TransactionResult {
  success: true;
  touchedNodeIds: string[];
  warnings: string[];
}

export interface TransactionFailure {
  success: false;
  errorCode: EngineErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type NewNodeSpec =
  | (Omit<FrameNode, 'id' | 'children'> & { type: 'FRAME'; children?: SceneNode[] })
  | (Omit<TextNode, 'id'> & { type: 'TEXT' })
  | Omit<RectangleNode, 'id'> & { type: 'RECTANGLE' }
  | Omit<EllipseNode, 'id'> & { type: 'ELLIPSE' }
  | Omit<LineNode, 'id'> & { type: 'LINE' }
  | Omit<PolygonNode, 'id'> & { type: 'POLYGON' }
  | Omit<StarNode, 'id'> & { type: 'STAR' }
  | Omit<VectorNode, 'id'> & { type: 'VECTOR' }
  | (Omit<BooleanOperationNode, 'id' | 'children'> & { type: 'BOOLEAN_OPERATION'; children?: SceneNode[] })
  | (Omit<TransformGroupNode, 'id' | 'children'> & { type: 'TRANSFORM_GROUP'; children?: SceneNode[] })
  | (Omit<GroupNode, 'id' | 'children'> & { type: 'GROUP'; children?: SceneNode[] })
  | Omit<SliceNode, 'id'> & { type: 'SLICE' }
  | (Omit<SectionNode, 'id' | 'children'> & { type: 'SECTION'; children?: SceneNode[] })
  | Omit<TableNode, 'id'>
  | Omit<ComponentInstanceNode, 'id'>
  | Omit<ComponentNode, 'id'>
  | Omit<ComponentSetNode, 'id'>
  | Omit<InstanceNode, 'id'>
  | (Omit<PageNode, 'id' | 'children'> & { type: 'PAGE' });

export type SceneGraphOperation =
  | { op: 'createNode'; parentId: string; index?: number; node: NewNodeSpec }
  | { op: 'updateNode'; nodeId: string; patch: Record<string, unknown> }
  | { op: 'deleteNode'; nodeId: string }
  | { op: 'moveNode'; nodeId: string; newParentId: string; index?: number }
  | { op: 'detachInstance'; nodeId: string };

/** Registers raster bytes on the file envelope and sidecar (used by `figma.createImage` script ops). */
export type AssetRegisterOperation = {
  op: 'registerAssetBytes';
  mimeType: AssetRecord['mimeType'];
  dataBase64: string;
};

/** Scene graph + envelope (variables / local styles) + asset mutations in one transactional batch. */
export type EngineOperation = SceneGraphOperation | EnvelopeOperation | AssetRegisterOperation;

export type { EnvelopeOperation };

export function isAssetRegisterOperation(op: { op: string }): op is AssetRegisterOperation {
  return op.op === 'registerAssetBytes';
}

const EXCLUDED_PATCH_KEYS = new Set([
  'pluginData',
  'sharedPluginData',
  'relaunchData',
  'id',
  'type',
  'children',
]);

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseTextOnPath(raw: unknown, label: string): TextNode['textOnPath'] {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label} must be an object`);
  }
  const pathId =
    typeof raw.pathId === 'string'
      ? raw.pathId
      : typeof raw.pathNodeId === 'string'
        ? raw.pathNodeId
        : null;
  if (!pathId || !/^I[0-9]+$/.test(pathId)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}.pathId must be a node id`);
  }
  if (raw.startOffset === undefined) return { pathId };
  if (typeof raw.startOffset !== 'number' || !Number.isFinite(raw.startOffset)) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}.startOffset must be a finite number`);
  }
  return { pathId, startOffset: raw.startOffset };
}

export function validateTransformModifiers(modifiers: unknown, label: string): TransformModifier[] {
  if (modifiers === undefined || modifiers === null) {
    throw new ValidationErr('VALIDATION_ERROR', `in ${label}: Property "modifiers" failed validation: Required value missing`);
  }
  if (!Array.isArray(modifiers)) {
    throw new ValidationErr('VALIDATION_ERROR', `in ${label}: Property "modifiers" failed validation: Expected array`);
  }
  const out: TransformModifier[] = [];
  for (let i = 0; i < modifiers.length; i++) {
    const m = modifiers[i];
    if (!isRecord(m) || m.type !== 'REPEAT') {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}].type must be REPEAT`);
    }
    if (typeof m.count !== 'number' || !Number.isInteger(m.count) || m.count < 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}].count must be integer >= 1`);
    }
    if (m.unitType !== 'RELATIVE' && m.unitType !== 'PIXELS') {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}].unitType must be RELATIVE or PIXELS`);
    }
    if (typeof m.offset !== 'number' || !Number.isFinite(m.offset)) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}].offset must be a finite number`);
    }
    if (m.repeatType === 'LINEAR') {
      if (m.axis !== 'HORIZONTAL' && m.axis !== 'VERTICAL') {
        throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}].axis must be HORIZONTAL or VERTICAL`);
      }
      out.push({
        type: 'REPEAT',
        repeatType: 'LINEAR',
        axis: m.axis,
        count: m.count,
        unitType: m.unitType,
        offset: m.offset,
      });
    } else if (m.repeatType === 'RADIAL') {
      out.push({
        type: 'REPEAT',
        repeatType: 'RADIAL',
        count: m.count,
        unitType: m.unitType,
        offset: m.offset,
      });
    } else {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}].repeatType must be LINEAR or RADIAL`);
    }
  }
  return out;
}

export type AnyTreeNode = DocumentNode | PageNode | SceneNode;

function findNode(root: DocumentNode, id: string): AnyTreeNode | null {
  if (root.id === id) return root;
  for (const p of root.children) {
    if (p.id === id) return p;
    const hit = findInSceneList(p.children, id);
    if (hit) return hit;
  }
  return null;
}

function findInSceneList(nodes: SceneNode[], id: string): AnyTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
      const inner = findInSceneList(n.children, id);
      if (inner) return inner;
    }
    if (n.type === 'BOOLEAN_OPERATION') {
      const inner = findInSceneList(n.children as unknown as SceneNode[], id);
      if (inner) return inner;
    }
  }
  return null;
}

function findParent(
  root: DocumentNode,
  id: string
): DocumentNode | PageNode | FrameNode | TransformGroupNode | GroupNode | SectionNode | BooleanOperationNode | null {
  for (const page of root.children) {
    if (page.id === id) return root;
    const hit = findParentInFrames(page.children, id, page);
    if (hit) return hit;
  }
  return null;
}

function findParentInFrames(
  nodes: SceneNode[],
  id: string,
  parent: PageNode | FrameNode | TransformGroupNode | GroupNode | SectionNode | BooleanOperationNode
): PageNode | FrameNode | TransformGroupNode | GroupNode | SectionNode | BooleanOperationNode | null {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
      const inner = findParentInFrames(n.children, id, n);
      if (inner) return inner;
    }
    if (n.type === 'BOOLEAN_OPERATION') {
      const inner = findParentInFrames(n.children as unknown as SceneNode[], id, n);
      if (inner) return inner;
    }
  }
  return null;
}

function isStrictAutoLayoutFrame(n: SceneNode): n is FrameNode {
  return n.type === 'FRAME' && (n.layoutMode === 'HORIZONTAL' || n.layoutMode === 'VERTICAL');
}

/** Figma Plugin parity: sizing fields apply only on auto-layout frames, their subtree children, or text. */
export function validateLayoutSizingNodeContextForParent(
  doc: DocumentNode,
  node: SceneNode,
  logicalParent: AnyTreeNode | null,
  errorFieldHint?: 'layoutSizingHorizontal' | 'layoutSizingVertical'
): void {
  const lf = node as LayoutSelfFields;
  if (lf.layoutSizingHorizontal === undefined && lf.layoutSizingVertical === undefined) return;
  if (node.type === 'TEXT') return;

  const selfAl = isStrictAutoLayoutFrame(node);

  let underAl = false;
  if (
    logicalParent !== null &&
    logicalParent !== doc &&
    logicalParent.type === 'FRAME' &&
    isStrictAutoLayoutFrame(logicalParent)
  ) {
    underAl = true;
  }

  if (!selfAl && !underAl) {
    const field =
      errorFieldHint ??
      (lf.layoutSizingHorizontal !== undefined ? 'layoutSizingHorizontal' : 'layoutSizingVertical');
    throw new ValidationErr(
      'VALIDATION_ERROR',
      `${field}: node must be an auto-layout frame or a child of an auto-layout frame`
    );
  }
}

function validateRgb(c: { r: unknown; g: unknown; b: unknown }, label: string): void {
  for (const k of ['r', 'g', 'b'] as const) {
    const v = c[k];
    if (typeof v !== 'number' || v < 0 || v > 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.${k} must be number 0..1`);
    }
  }
}

function parseStyledSegments(raw: unknown): StyledSegment[] | undefined {
  return parseStyledSegmentsInput(raw);
}

function validateFrameGeometry(n: Pick<FrameNode, 'width' | 'height'>): void {
  if (n.width < 0 || n.height < 0) {
    throw new ValidationErr('CONSTRAINT_VIOLATION', 'FRAME width/height must be >= 0');
  }
}

function validateTextGeometry(n: Pick<TextNode, 'width' | 'height'>): void {
  if (n.width < 0 || n.height < 0) {
    throw new ValidationErr('CONSTRAINT_VIOLATION', 'TEXT width/height must be >= 0');
  }
}

function validateShapeBox(n: Pick<FrameNode, 'width' | 'height'>): void {
  if (n.width < 0 || n.height < 0) {
    throw new ValidationErr('CONSTRAINT_VIOLATION', 'shape width/height must be >= 0');
  }
}

const STROKE_ALIGN = new Set(['INSIDE', 'OUTSIDE', 'CENTER']);
const STROKE_CAPS = new Set(['NONE', 'ROUND', 'SQUARE', 'ARROW_LINES', 'ARROW_EQUILATERAL']);
const STROKE_JOINS = new Set(['MITER', 'BEVEL', 'ROUND']);

function validateStrokeGeometry(
  label: string,
  fields: {
    strokeAlign?: unknown;
    strokeCap?: unknown;
    strokeJoin?: unknown;
    miterLimit?: unknown;
    dashPattern?: unknown;
  }
): void {
  if (fields.strokeAlign !== undefined) {
    if (typeof fields.strokeAlign !== 'string' || !STROKE_ALIGN.has(fields.strokeAlign)) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: strokeAlign invalid`);
    }
  }
  if (fields.strokeCap !== undefined) {
    if (typeof fields.strokeCap !== 'string' || !STROKE_CAPS.has(fields.strokeCap)) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: strokeCap invalid`);
    }
  }
  if (fields.strokeJoin !== undefined) {
    if (typeof fields.strokeJoin !== 'string' || !STROKE_JOINS.has(fields.strokeJoin)) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: strokeJoin invalid`);
    }
  }
  if (fields.miterLimit !== undefined) {
    if (typeof fields.miterLimit !== 'number' || !Number.isFinite(fields.miterLimit) || fields.miterLimit < 0) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}: miterLimit must be finite number >= 0`);
    }
  }
  if (fields.dashPattern !== undefined) {
    if (!Array.isArray(fields.dashPattern)) throw new ValidationErr('VALIDATION_ERROR', `${label}: dashPattern must be array`);
    for (let i = 0; i < fields.dashPattern.length; i++) {
      const d = fields.dashPattern[i];
      if (typeof d !== 'number' || !Number.isFinite(d) || d < 0) {
        throw new ValidationErr('VALIDATION_ERROR', `${label}: dashPattern entries must be finite >= 0`);
      }
    }
  }
}

function validateBlendMode(v: unknown, label: string): void {
  if (v === undefined) return;
  if (typeof v !== 'string') throw new ValidationErr('VALIDATION_ERROR', `${label}: blendMode must be string`);
}

function normalizeNewFrame(spec: Extract<NewNodeSpec, { type: 'FRAME' }>, id: string, env: FileEnvelope): FrameNode {
  const frame: FrameNode = {
    id,
    type: 'FRAME',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Frame',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    /** New nodes always start empty; subtrees are added via further ops. */
    children: [],
    fills: spec.fills !== undefined ? spec.fills : [...DEFAULT_FRAME_FILLS],
    backgrounds: spec.backgrounds,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
    effects: spec.effects,
    clipsContent: spec.clipsContent,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
    strokeAlign: spec.strokeAlign,
    strokeCap: spec.strokeCap,
    strokeJoin: spec.strokeJoin,
    miterLimit: spec.miterLimit,
    dashPattern: spec.dashPattern,
    cornerRadius: spec.cornerRadius,
    topLeftRadius: spec.topLeftRadius,
    topRightRadius: spec.topRightRadius,
    bottomRightRadius: spec.bottomRightRadius,
    bottomLeftRadius: spec.bottomLeftRadius,
    layoutMode: spec.layoutMode,
    paddingLeft: spec.paddingLeft,
    paddingRight: spec.paddingRight,
    paddingTop: spec.paddingTop,
    paddingBottom: spec.paddingBottom,
    itemSpacing: spec.itemSpacing,
    layoutWrap: spec.layoutWrap,
    counterAxisSpacing: spec.counterAxisSpacing,
    counterAxisAlignContent: spec.counterAxisAlignContent,
    primaryAxisAlignItems: spec.primaryAxisAlignItems,
    counterAxisAlignItems: spec.counterAxisAlignItems,
    layoutGrids: spec.layoutGrids,
    primaryAxisSizingMode: spec.primaryAxisSizingMode,
    counterAxisSizingMode: spec.counterAxisSizingMode,
  };
  validateFrameGeometry(frame);
  if (frame.fills) frame.fills = validatePaintArray(frame.fills, 'fills', env) ?? [];
  if (frame.backgrounds) frame.backgrounds = validatePaintArray(frame.backgrounds, 'backgrounds', env) ?? [];
  if (frame.strokes) frame.strokes = validatePaintArray(frame.strokes, 'strokes', env) ?? [];
  if (frame.effects) frame.effects = validateEffects(frame.effects, 'effects') ?? [];
  validateStrokeGeometry('FRAME', frame);
  validateBlendMode(spec.blendMode, 'FRAME.blendMode');
  if (frame.strokeWeight !== undefined && (typeof frame.strokeWeight !== 'number' || frame.strokeWeight < 0)) {
    throw new ValidationErr('VALIDATION_ERROR', 'strokeWeight must be number >= 0');
  }
  if (frame.opacity !== undefined && (typeof frame.opacity !== 'number' || frame.opacity < 0 || frame.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (frame.rotation !== undefined && typeof frame.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (frame.visible !== undefined && typeof frame.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  if (frame.clipsContent !== undefined && typeof frame.clipsContent !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'clipsContent must be boolean');
  }
  for (const key of ['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'] as const) {
    const v = frame[key];
    if (v !== undefined && (typeof v !== 'number' || v < 0)) {
      throw new ValidationErr('VALIDATION_ERROR', `${key} must be number >= 0`);
    }
  }
  validateOptionalLayoutMode(frame.layoutMode);
  validateOptionalLayoutWrap(frame.layoutWrap);
  validateOptionalCounterAxisAlignContent(frame.counterAxisAlignContent);
  validateOptionalPrimaryAxisAlignItems(frame.primaryAxisAlignItems);
  validateOptionalCounterAxisAlignItems(frame.counterAxisAlignItems);
  validateLayoutNumbers(frame);
  applyLayoutSelfFromSpec(frame, spec as Record<string, unknown>);
  return frame;
}

function validateOptionalLayoutMode(v: unknown): void {
  if (v === undefined) return;
  if (v !== 'NONE' && v !== 'HORIZONTAL' && v !== 'VERTICAL') {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutMode must be NONE, HORIZONTAL, or VERTICAL');
  }
}

function validateOptionalLayoutWrap(v: unknown): void {
  if (v === undefined) return;
  if (v !== 'NO_WRAP' && v !== 'WRAP') {
    throw new ValidationErr('VALIDATION_ERROR', 'layoutWrap must be NO_WRAP or WRAP');
  }
}

function validateOptionalCounterAxisAlignContent(v: unknown): void {
  if (v === undefined) return;
  if (v !== 'AUTO' && v !== 'SPACE_BETWEEN') {
    throw new ValidationErr('VALIDATION_ERROR', 'counterAxisAlignContent must be AUTO or SPACE_BETWEEN');
  }
}

/** Plugin API: `'MIN' | 'MAX' | 'CENTER' | 'SPACE_BETWEEN'` only. */
function validateOptionalPrimaryAxisAlignItems(v: unknown): void {
  if (v === undefined) return;
  const ok = new Set(['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN']);
  if (typeof v !== 'string' || !ok.has(v)) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      'primaryAxisAlignItems invalid — expected MIN | MAX | CENTER | SPACE_BETWEEN'
    );
  }
}

/** Plugin API: `'MIN' | 'MAX' | 'CENTER' | 'BASELINE'` only (no STRETCH; use child layout sizing). */
function validateOptionalCounterAxisAlignItems(v: unknown): void {
  if (v === undefined) return;
  const ok = new Set(['MIN', 'CENTER', 'MAX', 'BASELINE']);
  if (typeof v !== 'string' || !ok.has(v)) {
    throw new ValidationErr(
      'VALIDATION_ERROR',
      'counterAxisAlignItems invalid — expected MIN | MAX | CENTER | BASELINE'
    );
  }
}

function validateLayoutNumbers(f: FrameNode): void {
  for (const [k, v] of [
    ['paddingLeft', f.paddingLeft],
    ['paddingRight', f.paddingRight],
    ['paddingTop', f.paddingTop],
    ['paddingBottom', f.paddingBottom],
    ['itemSpacing', f.itemSpacing],
    ['counterAxisSpacing', f.counterAxisSpacing],
  ] as const) {
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new ValidationErr('VALIDATION_ERROR', `${k} must be finite number >= 0`);
    }
  }
  if (f.layoutGrids !== undefined) {
    const grids = normalizeLayoutGrids(f.layoutGrids, f.width);
    if (grids === undefined) {
      delete f.layoutGrids;
    } else {
      f.layoutGrids = grids;
      for (let i = 0; i < grids.length; i++) {
        const g = grids[i]!;
        if (g.color !== undefined) {
          if (!isRecord(g.color)) throw new ValidationErr('VALIDATION_ERROR', 'layoutGrids.color invalid');
          validateRgb(g.color as { r: unknown; g: unknown; b: unknown }, `layoutGrids[${String(i)}].color`);
        }
      }
    }
  }
}

function normalizeNewText(spec: Extract<NewNodeSpec, { type: 'TEXT' }>, id: string, env: FileEnvelope): TextNode {
  const characters = typeof spec.characters === 'string' ? spec.characters : '';
  const styledSegments =
    spec.styledSegments !== undefined ? parseStyledSegmentsInput(spec.styledSegments) : undefined;
  validateStyledSegments(characters, styledSegments);
  if (spec.textStyleId !== undefined) {
    if (typeof spec.textStyleId !== 'string' || !env.textStyles?.some((s) => s.id === spec.textStyleId)) {
      throw new ValidationErr('VALIDATION_ERROR', 'TEXT.textStyleId must reference an existing text style');
    }
  }
  const textOnPath = parseTextOnPath(spec.textOnPath, 'TEXT.textOnPath');
  const text: TextNode = {
    id,
    type: 'TEXT',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Text',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 24,
    characters,
    fontSize: typeof spec.fontSize === 'number' ? spec.fontSize : 12,
    fontWeight: typeof spec.fontWeight === 'number' ? spec.fontWeight : 400,
    fills: spec.fills,
    effects: spec.effects,
    styledSegments: styledSegments ?? [],
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
    textStyleId: spec.textStyleId,
    textOnPath,
  };
  validateTextGeometry(text);
  if (text.fills) text.fills = validatePaintArray(text.fills, 'fills', env) ?? [];
  if (text.effects) text.effects = validateEffects(text.effects, 'effects') ?? [];
  validateBlendMode(spec.blendMode, 'TEXT.blendMode');
  if (text.opacity !== undefined && (typeof text.opacity !== 'number' || text.opacity < 0 || text.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (text.rotation !== undefined && typeof text.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (text.visible !== undefined && typeof text.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  applyLayoutSelfFromSpec(text, spec as Record<string, unknown>);
  return text;
}

function normalizeNewRectangle(spec: Extract<NewNodeSpec, { type: 'RECTANGLE' }>, id: string, env: FileEnvelope): RectangleNode {
  if (spec.fillStyleId !== undefined) {
    if (typeof spec.fillStyleId !== 'string' || !env.paintStyles?.some((s) => s.id === spec.fillStyleId)) {
      throw new ValidationErr('VALIDATION_ERROR', 'RECTANGLE.fillStyleId must reference an existing paint style');
    }
  }
  if (spec.effectStyleId !== undefined) {
    if (typeof spec.effectStyleId !== 'string' || !env.effectStyles?.some((s) => s.id === spec.effectStyleId)) {
      throw new ValidationErr('VALIDATION_ERROR', 'RECTANGLE.effectStyleId must reference an existing effect style');
    }
  }
  const n: RectangleNode = {
    id,
    type: 'RECTANGLE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Rectangle',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    fills: spec.fills,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
    strokeAlign: spec.strokeAlign,
    strokeCap: spec.strokeCap,
    strokeJoin: spec.strokeJoin,
    miterLimit: spec.miterLimit,
    dashPattern: spec.dashPattern,
    cornerRadius: spec.cornerRadius,
    topLeftRadius: spec.topLeftRadius,
    topRightRadius: spec.topRightRadius,
    bottomRightRadius: spec.bottomRightRadius,
    bottomLeftRadius: spec.bottomLeftRadius,
    effects: spec.effects,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
    fillStyleId: spec.fillStyleId,
    effectStyleId: spec.effectStyleId,
  };
  validateShapeBox(n);
  if (n.fills) n.fills = validatePaintArray(n.fills, 'fills', env) ?? [];
  if (n.strokes) n.strokes = validatePaintArray(n.strokes, 'strokes', env) ?? [];
  if (n.effects) n.effects = validateEffects(n.effects, 'effects') ?? [];
  if (n.strokeWeight !== undefined && (typeof n.strokeWeight !== 'number' || n.strokeWeight < 0)) {
    throw new ValidationErr('VALIDATION_ERROR', 'strokeWeight must be number >= 0');
  }
  for (const key of ['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'] as const) {
    const v = n[key];
    if (v !== undefined && (typeof v !== 'number' || v < 0)) {
      throw new ValidationErr('VALIDATION_ERROR', `${key} must be number >= 0`);
    }
  }
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  validateStrokeGeometry('RECTANGLE', n);
  validateBlendMode(spec.blendMode, 'RECTANGLE.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewEllipse(spec: Extract<NewNodeSpec, { type: 'ELLIPSE' }>, id: string, env: FileEnvelope): EllipseNode {
  const n: EllipseNode = {
    id,
    type: 'ELLIPSE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Ellipse',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    fills: spec.fills,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
    strokeAlign: spec.strokeAlign,
    strokeCap: spec.strokeCap,
    strokeJoin: spec.strokeJoin,
    miterLimit: spec.miterLimit,
    dashPattern: spec.dashPattern,
    arcData: spec.arcData,
    effects: spec.effects,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  if (n.fills) n.fills = validatePaintArray(n.fills, 'fills', env) ?? [];
  if (n.strokes) n.strokes = validatePaintArray(n.strokes, 'strokes', env) ?? [];
  if (n.effects) n.effects = validateEffects(n.effects, 'effects') ?? [];
  if (n.strokeWeight !== undefined && (typeof n.strokeWeight !== 'number' || n.strokeWeight < 0)) {
    throw new ValidationErr('VALIDATION_ERROR', 'strokeWeight must be number >= 0');
  }
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  validateStrokeGeometry('ELLIPSE', n);
  validateBlendMode(spec.blendMode, 'ELLIPSE.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewLine(spec: Extract<NewNodeSpec, { type: 'LINE' }>, id: string, env: FileEnvelope): LineNode {
  const strokes = spec.strokes;
  if (!Array.isArray(strokes) || strokes.length === 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'LINE.strokes must be a non-empty array');
  }
  const sw = spec.strokeWeight;
  if (typeof sw !== 'number' || sw <= 0 || !Number.isFinite(sw)) {
    throw new ValidationErr('VALIDATION_ERROR', 'LINE.strokeWeight must be a positive finite number');
  }
  const n: LineNode = {
    id,
    type: 'LINE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Line',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 0,
    strokes: validatePaintArray(strokes, 'strokes', env) ?? [],
    strokeWeight: sw,
    strokeCap: spec.strokeCap,
    strokeJoin: spec.strokeJoin,
    dashPattern: spec.dashPattern,
    effects: spec.effects,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  if (n.effects) n.effects = validateEffects(n.effects, 'effects') ?? [];
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  validateStrokeGeometry('LINE', n);
  validateBlendMode(spec.blendMode, 'LINE.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewPolygon(spec: Extract<NewNodeSpec, { type: 'POLYGON' }>, id: string, env: FileEnvelope): PolygonNode {
  const pc = spec.pointCount;
  if (typeof pc !== 'number' || !Number.isInteger(pc) || pc < 3) {
    throw new ValidationErr('VALIDATION_ERROR', 'POLYGON.pointCount must be an integer >= 3');
  }
  const n: PolygonNode = {
    id,
    type: 'POLYGON',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Polygon',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    pointCount: pc,
    fills: spec.fills,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
    strokeAlign: spec.strokeAlign,
    strokeCap: spec.strokeCap,
    strokeJoin: spec.strokeJoin,
    miterLimit: spec.miterLimit,
    dashPattern: spec.dashPattern,
    effects: spec.effects,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  if (n.fills) n.fills = validatePaintArray(n.fills, 'fills', env) ?? [];
  if (n.strokes) n.strokes = validatePaintArray(n.strokes, 'strokes', env) ?? [];
  if (n.effects) n.effects = validateEffects(n.effects, 'effects') ?? [];
  if (n.strokeWeight !== undefined && (typeof n.strokeWeight !== 'number' || n.strokeWeight < 0)) {
    throw new ValidationErr('VALIDATION_ERROR', 'strokeWeight must be number >= 0');
  }
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  validateStrokeGeometry('POLYGON', n);
  validateBlendMode(spec.blendMode, 'POLYGON.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewStar(spec: Extract<NewNodeSpec, { type: 'STAR' }>, id: string, env: FileEnvelope): StarNode {
  const pc = spec.pointCount;
  if (typeof pc !== 'number' || !Number.isInteger(pc) || pc < 3) {
    throw new ValidationErr('VALIDATION_ERROR', 'STAR.pointCount must be an integer >= 3');
  }
  const ir = spec.innerRadius;
  if (typeof ir !== 'number' || ir < 0 || ir > 1 || !Number.isFinite(ir)) {
    throw new ValidationErr('VALIDATION_ERROR', 'STAR.innerRadius must be a number 0..1');
  }
  const n: StarNode = {
    id,
    type: 'STAR',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Star',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    pointCount: pc,
    innerRadius: ir,
    fills: spec.fills,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
    strokeAlign: spec.strokeAlign,
    strokeCap: spec.strokeCap,
    strokeJoin: spec.strokeJoin,
    miterLimit: spec.miterLimit,
    dashPattern: spec.dashPattern,
    effects: spec.effects,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  if (n.fills) n.fills = validatePaintArray(n.fills, 'fills', env) ?? [];
  if (n.strokes) n.strokes = validatePaintArray(n.strokes, 'strokes', env) ?? [];
  if (n.effects) n.effects = validateEffects(n.effects, 'effects') ?? [];
  if (n.strokeWeight !== undefined && (typeof n.strokeWeight !== 'number' || n.strokeWeight < 0)) {
    throw new ValidationErr('VALIDATION_ERROR', 'strokeWeight must be number >= 0');
  }
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  validateStrokeGeometry('STAR', n);
  validateBlendMode(spec.blendMode, 'STAR.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function isBooleanOperandType(t: string): boolean {
  return t === 'RECTANGLE' || t === 'ELLIPSE' || t === 'POLYGON' || t === 'STAR' || t === 'VECTOR';
}

function normalizeNewVector(spec: Extract<NewNodeSpec, { type: 'VECTOR' }>, id: string, env: FileEnvelope): VectorNode {
  const vps = spec.vectorPaths;
  if (!Array.isArray(vps) || vps.length === 0) {
    throw new ValidationErr('VALIDATION_ERROR', 'VECTOR.vectorPaths must be a non-empty array');
  }
  for (let i = 0; i < vps.length; i++) {
    const p = vps[i] as unknown;
    if (!isRecord(p)) throw new ValidationErr('VALIDATION_ERROR', `vectorPaths[${String(i)}] invalid`);
    if (p.windingRule !== 'NONZERO' && p.windingRule !== 'EVENODD') {
      throw new ValidationErr('VALIDATION_ERROR', `vectorPaths[${String(i)}].windingRule invalid`);
    }
    if (typeof p.data !== 'string' || p.data.length === 0) {
      throw new ValidationErr('VALIDATION_ERROR', `vectorPaths[${String(i)}].data must be non-empty string`);
    }
  }
  const firstPath = vps[0] as { windingRule: string; data: string };
  const normalized = normalizePathDataToOrigin(firstPath.data);
  const n: VectorNode = {
    id,
    type: 'VECTOR',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Vector',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: normalized.width,
    height: normalized.height,
    vectorPaths: [
      {
        windingRule: firstPath.windingRule === 'EVENODD' ? 'EVENODD' : 'NONZERO',
        data: normalized.data,
      },
    ],
    fills: spec.fills,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
    strokeAlign: spec.strokeAlign,
    strokeCap: spec.strokeCap,
    strokeJoin: spec.strokeJoin,
    miterLimit: spec.miterLimit,
    dashPattern: spec.dashPattern,
    effects: spec.effects,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  if (n.fills) n.fills = validatePaintArray(n.fills, 'fills', env) ?? [];
  if (n.strokes) n.strokes = validatePaintArray(n.strokes, 'strokes', env) ?? [];
  if (n.effects) n.effects = validateEffects(n.effects, 'effects') ?? [];
  validateStrokeGeometry('VECTOR', n);
  validateBlendMode(spec.blendMode, 'VECTOR.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewTable(spec: Extract<NewNodeSpec, { type: 'TABLE' }>, id: string, env: FileEnvelope): TableNode {
  const cc = spec.columnCount;
  const rc = spec.rowCount;
  if (typeof cc !== 'number' || !Number.isInteger(cc) || cc < 1) {
    throw new ValidationErr('VALIDATION_ERROR', 'TABLE.columnCount must be integer >= 1');
  }
  if (typeof rc !== 'number' || !Number.isInteger(rc) || rc < 1) {
    throw new ValidationErr('VALIDATION_ERROR', 'TABLE.rowCount must be integer >= 1');
  }
  if (!Array.isArray(spec.columnWidths) || spec.columnWidths.length !== cc) {
    throw new ValidationErr('VALIDATION_ERROR', 'TABLE.columnWidths length must match columnCount');
  }
  if (!Array.isArray(spec.rowHeights) || spec.rowHeights.length !== rc) {
    throw new ValidationErr('VALIDATION_ERROR', 'TABLE.rowHeights length must match rowCount');
  }
  for (let i = 0; i < spec.columnWidths.length; i++) {
    const w = spec.columnWidths[i];
    if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) {
      throw new ValidationErr('VALIDATION_ERROR', `TABLE.columnWidths[${String(i)}] must be finite > 0`);
    }
  }
  for (let i = 0; i < spec.rowHeights.length; i++) {
    const h = spec.rowHeights[i];
    if (typeof h !== 'number' || !Number.isFinite(h) || h <= 0) {
      throw new ValidationErr('VALIDATION_ERROR', `TABLE.rowHeights[${String(i)}] must be finite > 0`);
    }
  }
  if (!Array.isArray(spec.cells) || spec.cells.length !== cc * rc) {
    throw new ValidationErr('VALIDATION_ERROR', 'TABLE.cells must have length columnCount * rowCount');
  }
  const cells: TableNode['cells'] = [];
  for (let i = 0; i < spec.cells.length; i++) {
    const c = spec.cells[i];
    if (!isRecord(c) || typeof c.text !== 'string') {
      throw new ValidationErr('VALIDATION_ERROR', `TABLE.cells[${String(i)}] must have text string`);
    }
    const fills = c.fills !== undefined ? validatePaintArray(c.fills, `TABLE.cells[${String(i)}].fills`, env) : undefined;
    cells.push({ text: c.text, fills });
  }
  const n: TableNode = {
    id,
    type: 'TABLE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Table',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    columnCount: cc,
    rowCount: rc,
    columnWidths: [...spec.columnWidths],
    rowHeights: [...spec.rowHeights],
    cells,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  validateBlendMode(spec.blendMode, 'TABLE.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  return n;
}

function normalizeNewComponentInstance(
  spec: Extract<NewNodeSpec, { type: 'COMPONENT_INSTANCE' }>,
  id: string,
  env: FileEnvelope
): ComponentInstanceNode {
  const mid = spec.mainComponentId;
  if (typeof mid !== 'string' || !env.components?.some((c) => c.id === mid)) {
    throw new ValidationErr('VALIDATION_ERROR', 'COMPONENT_INSTANCE.mainComponentId must reference an existing component');
  }
  let overrides: ComponentInstanceNode['overrides'];
  if (spec.overrides !== undefined) {
    if (!isRecord(spec.overrides)) throw new ValidationErr('VALIDATION_ERROR', 'overrides must be object');
    overrides = {};
    for (const [nodeId, ov] of Object.entries(spec.overrides)) {
      if (!/^I[0-9]+$/.test(nodeId)) {
        throw new ValidationErr('VALIDATION_ERROR', `overrides key invalid: ${nodeId}`);
      }
      if (!isRecord(ov)) throw new ValidationErr('VALIDATION_ERROR', `overrides.${nodeId} must be object`);
      const entry: import('../model/types.js').ComponentOverrideFields = {};
      if ('characters' in ov) {
        if (typeof ov.characters !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'override.characters must be string');
        entry.characters = ov.characters;
      }
      if ('fontSize' in ov) {
        if (typeof ov.fontSize !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontSize must be number');
        entry.fontSize = ov.fontSize;
      }
      if ('fontWeight' in ov) {
        if (typeof ov.fontWeight !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontWeight must be number');
        entry.fontWeight = ov.fontWeight;
      }
      if ('fills' in ov && ov.fills !== undefined) {
        entry.fills = validatePaintArray(ov.fills, `overrides.${nodeId}.fills`, env);
      }
      overrides[nodeId] = entry;
    }
  }
  const n: ComponentInstanceNode = {
    id,
    type: 'COMPONENT_INSTANCE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Instance',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    mainComponentId: mid,
    overrides,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  validateBlendMode(spec.blendMode, 'COMPONENT_INSTANCE.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  return n;
}

function normalizeNewComponent(
  spec: Extract<NewNodeSpec, { type: 'COMPONENT' }>,
  id: string,
  env: FileEnvelope
): ComponentNode {
  const rootFrameId = spec.rootFrameId;
  const root = findNode(env.document, rootFrameId);
  if (!root || root.type !== 'FRAME') {
    throw new ValidationErr('VALIDATION_ERROR', 'COMPONENT.rootFrameId must reference a FRAME node');
  }

  const n: ComponentNode = {
    id,
    type: 'COMPONENT',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Component',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    rootFrameId,
    componentPropertyDefinitions: spec.componentPropertyDefinitions,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
    layoutAlign: spec.layoutAlign,
    layoutGrow: spec.layoutGrow,
    minWidth: spec.minWidth,
    maxWidth: spec.maxWidth,
    minHeight: spec.minHeight,
    maxHeight: spec.maxHeight,
    isMask: spec.isMask,
  };

  validateShapeBox(n as unknown as FrameNode);
  validateBlendMode(spec.blendMode, 'COMPONENT.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  return n;
}

function validateComponentPropertyValue(v: unknown, label: string): ComponentPropertyValue {
  if (!isRecord(v)) throw new ValidationErr('VALIDATION_ERROR', `${label} must be object`);
  const t = (v as Record<string, unknown>).type;
  if (t !== 'BOOLEAN' && t !== 'TEXT' && t !== 'VARIANT' && t !== 'INSTANCE_SWAP') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}.type invalid`);
  }
  if (t === 'BOOLEAN') {
    if (typeof (v as Record<string, unknown>).value !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', `${label}.value must be boolean`);
    return v as ComponentPropertyValue;
  }
  if (t === 'TEXT') {
    if (typeof (v as Record<string, unknown>).value !== 'string') throw new ValidationErr('VALIDATION_ERROR', `${label}.value must be string`);
    return v as ComponentPropertyValue;
  }
  if (t === 'VARIANT') {
    if (typeof (v as Record<string, unknown>).value !== 'string') throw new ValidationErr('VALIDATION_ERROR', `${label}.value must be string`);
    return v as ComponentPropertyValue;
  }
  // INSTANCE_SWAP
  if (typeof (v as Record<string, unknown>).value !== 'string') throw new ValidationErr('VALIDATION_ERROR', `${label}.value must be string`);
  return v as ComponentPropertyValue;
}

function normalizeNewComponentSet(
  spec: Extract<NewNodeSpec, { type: 'COMPONENT_SET' }>,
  id: string,
  env: FileEnvelope
): ComponentSetNode {
  if (!Array.isArray(spec.componentIds) || spec.componentIds.length < 1) {
    throw new ValidationErr('VALIDATION_ERROR', 'COMPONENT_SET.componentIds must be a non-empty array');
  }
  const componentIds = [...spec.componentIds];
  for (const cid of componentIds) {
    const c = findNode(env.document, cid);
    if (!c || c.type !== 'COMPONENT') {
      throw new ValidationErr('VALIDATION_ERROR', `COMPONENT_SET.componentIds[?] must reference existing COMPONENT nodes (${cid})`);
    }
  }

  const n: ComponentSetNode = {
    id,
    type: 'COMPONENT_SET',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Component Set',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    componentIds,
    variantPropertyKey: spec.variantPropertyKey ?? 'variant',
    variantOptions: spec.variantOptions,
    nodeIdMapByComponentId: spec.nodeIdMapByComponentId,
    baseComponentId: spec.baseComponentId,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
    layoutAlign: spec.layoutAlign,
    layoutGrow: spec.layoutGrow,
    minWidth: spec.minWidth,
    maxWidth: spec.maxWidth,
    minHeight: spec.minHeight,
    maxHeight: spec.maxHeight,
    isMask: spec.isMask,
  };

  validateShapeBox(n as unknown as FrameNode);
  validateBlendMode(spec.blendMode, 'COMPONENT_SET.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }

  return n;
}

function normalizeNewInstance(
  spec: Extract<NewNodeSpec, { type: 'INSTANCE' }>,
  id: string,
  env: FileEnvelope
): InstanceNode {
  const mid = spec.mainComponentId;
  const target = findNode(env.document, mid);
  if (!target || (target.type !== 'COMPONENT' && target.type !== 'COMPONENT_SET' && target.type !== 'COMPONENT_INSTANCE')) {
    // Allow COMPONENT_INSTANCE for backward compat after migration.
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE.mainComponentId must reference an existing component');
  }

  let overrides: InstanceNode['overrides'];
  if (spec.overrides !== undefined) {
    if (!isRecord(spec.overrides)) throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE.overrides must be object');
    overrides = {};
    for (const [nodeId, ov] of Object.entries(spec.overrides)) {
      if (!/^I[0-9]+$/.test(nodeId)) {
        throw new ValidationErr('VALIDATION_ERROR', `INSTANCE.overrides key invalid: ${nodeId}`);
      }
      if (!isRecord(ov)) throw new ValidationErr('VALIDATION_ERROR', `INSTANCE.overrides.${nodeId} must be object`);
      const entry: import('../model/types.js').ComponentOverrideFields = {};
      if ('characters' in ov) {
        if (typeof (ov as Record<string, unknown>).characters !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'override.characters must be string');
        entry.characters = (ov as Record<string, unknown>).characters as string;
      }
      if ('fontSize' in ov) {
        if (typeof (ov as Record<string, unknown>).fontSize !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontSize must be number');
        entry.fontSize = (ov as Record<string, unknown>).fontSize as number;
      }
      if ('fontWeight' in ov) {
        if (typeof (ov as Record<string, unknown>).fontWeight !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontWeight must be number');
        entry.fontWeight = (ov as Record<string, unknown>).fontWeight as number;
      }
      if ('fills' in ov && (ov as Record<string, unknown>).fills !== undefined) {
        entry.fills = validatePaintArray((ov as Record<string, unknown>).fills, `overrides.${nodeId}.fills`, env);
      }
      overrides[nodeId] = entry;
    }
  }

  let componentProperties: InstanceNode['componentProperties'];
  if (spec.componentProperties !== undefined) {
    if (!isRecord(spec.componentProperties)) throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE.componentProperties must be object');
    componentProperties = {};
    for (const [k, v] of Object.entries(spec.componentProperties)) {
      componentProperties[k] = validateComponentPropertyValue(v, `componentProperties.${k}`);
    }
  }

  const n: InstanceNode = {
    id,
    type: 'INSTANCE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Instance',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    mainComponentId: mid,
    overrides,
    componentProperties,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
    layoutAlign: spec.layoutAlign,
    layoutGrow: spec.layoutGrow,
    minWidth: spec.minWidth,
    maxWidth: spec.maxWidth,
    minHeight: spec.minHeight,
    maxHeight: spec.maxHeight,
    isMask: spec.isMask,
  };

  validateShapeBox(n as unknown as FrameNode);
  validateBlendMode(spec.blendMode, 'INSTANCE.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  return n;
}

function normalizeNewPage(spec: Extract<NewNodeSpec, { type: 'PAGE' }>, id: string): PageNode {
  return {
    id,
    type: 'PAGE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Page',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 0,
    height: typeof spec.height === 'number' ? spec.height : 0,
    children: [],
  };
}

function normalizeNewBooleanOperation(
  spec: Extract<NewNodeSpec, { type: 'BOOLEAN_OPERATION' }>,
  id: string,
  env: FileEnvelope
): BooleanOperationNode {
  const bo = spec.booleanOperation;
  if (bo !== 'UNION' && bo !== 'SUBTRACT' && bo !== 'INTERSECT' && bo !== 'EXCLUDE') {
    throw new ValidationErr('VALIDATION_ERROR', 'BOOLEAN_OPERATION.booleanOperation invalid');
  }
  const n: BooleanOperationNode = {
    id,
    type: 'BOOLEAN_OPERATION',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Boolean',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    booleanOperation: bo,
    children: [],
    fills: spec.fills,
    effects: spec.effects,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  if (n.fills) n.fills = validatePaintArray(n.fills, 'fills', env) ?? [];
  if (n.effects) n.effects = validateEffects(n.effects, 'effects') ?? [];
  validateBlendMode(spec.blendMode, 'BOOLEAN_OPERATION.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewTransformGroup(
  spec: Extract<NewNodeSpec, { type: 'TRANSFORM_GROUP' }>,
  id: string,
  _env: FileEnvelope
): TransformGroupNode {
  const transformModifiers =
    spec.transformModifiers !== undefined
      ? validateTransformModifiers(spec.transformModifiers, 'TRANSFORM_GROUP.transformModifiers')
      : undefined;
  const n: TransformGroupNode = {
    id,
    type: 'TRANSFORM_GROUP',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Group',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    children: [],
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
    transformModifiers,
  };
  validateShapeBox(n);
  validateBlendMode(spec.blendMode, 'TRANSFORM_GROUP.blendMode');
  if (n.opacity !== undefined && (typeof n.opacity !== 'number' || n.opacity < 0 || n.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (n.rotation !== undefined && typeof n.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (n.visible !== undefined && typeof n.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewGroup(spec: Extract<NewNodeSpec, { type: 'GROUP' }>, id: string, _env: FileEnvelope): GroupNode {
  const n: GroupNode = {
    id,
    type: 'GROUP',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Group',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    children: [],
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  validateBlendMode(spec.blendMode, 'GROUP.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewSlice(spec: Extract<NewNodeSpec, { type: 'SLICE' }>, id: string, _env: FileEnvelope): SliceNode {
  const n: SliceNode = {
    id,
    type: 'SLICE',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Slice',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  validateBlendMode(spec.blendMode, 'SLICE.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function normalizeNewSection(
  spec: Extract<NewNodeSpec, { type: 'SECTION' }>,
  id: string,
  env: FileEnvelope
): SectionNode {
  const n: SectionNode = {
    id,
    type: 'SECTION',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Section',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 400,
    height: typeof spec.height === 'number' ? spec.height : 300,
    children: [],
    fills: spec.fills,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
    blendMode: spec.blendMode,
  };
  validateShapeBox(n);
  if (n.fills) n.fills = validatePaintArray(n.fills, 'fills', env) ?? [];
  validateBlendMode(spec.blendMode, 'SECTION.blendMode');
  applyLayoutSelfFromSpec(n, spec as Record<string, unknown>);
  return n;
}

function parentAllowsChild(parentType: string, childType: string): boolean {
  const rules = ENGINE_MATRIX.createNode.allowedChildPairs;
  return rules.some((r) => r.parent === parentType && r.child === childType);
}

function insertAt<T>(arr: T[], index: number | undefined, item: T): void {
  if (index === undefined || index >= arr.length) {
    arr.push(item);
    return;
  }
  arr.splice(index, 0, item);
}

function removeNodeById(root: DocumentNode, nodeId: string): void {
  const parent = findParent(root, nodeId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);
  if (parent.type === 'DOCUMENT') {
    const idx = parent.children.findIndex((p) => p.id === nodeId);
    if (idx < 0) throw new ValidationErr('UNKNOWN_NODE', `Unknown page ${nodeId}`);
    if (parent.children.length <= 1) {
      throw new ValidationErr('CONSTRAINT_VIOLATION', 'Cannot delete last PAGE');
    }
    parent.children.splice(idx, 1);
    return;
  }
  const list = parent.children;
  const idx = list.findIndex((c) => c.id === nodeId);
  if (idx < 0) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);
  list.splice(idx, 1);
}

function allocNodeId(working: FileEnvelope): string {
  const id = `I${String(working.nextInternalId)}`;
  working.nextInternalId += 1;
  return id;
}

function cloneSceneSubtreeWithNewIds(working: FileEnvelope, node: SceneNode): SceneNode {
  const cloned = structuredClone(node) as SceneNode;
  cloned.id = allocNodeId(working);
  if (
    cloned.type === 'FRAME' ||
    cloned.type === 'TRANSFORM_GROUP' ||
    cloned.type === 'GROUP' ||
    cloned.type === 'SECTION'
  ) {
    cloned.children = cloned.children.map((c) => cloneSceneSubtreeWithNewIds(working, c));
  } else if (cloned.type === 'BOOLEAN_OPERATION') {
    const b = cloned;
    b.children = b.children.map((c) => cloneSceneSubtreeWithNewIds(working, c as SceneNode) as (typeof b.children)[number]);
  }
  return cloned;
}

function resolveInstanceRootFrame(working: FileEnvelope, inst: InstanceNode): FrameNode {
  const target = findNode(working.document, inst.mainComponentId);
  if (!target) {
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE.mainComponentId missing');
  }
  let componentId = inst.mainComponentId;
  if (target.type === 'COMPONENT_SET') {
    const set = target;
    const key = set.variantPropertyKey ?? 'variant';
    const raw = inst.componentProperties?.[key]?.value ?? set.variantOptions?.[0];
    const options = set.variantOptions ?? set.componentIds;
    const idx = options.indexOf(String(raw));
    componentId = set.componentIds[idx] ?? set.componentIds[0]!;
  }
  const component = findNode(working.document, componentId);
  if (!component || component.type !== 'COMPONENT') {
    throw new ValidationErr('VALIDATION_ERROR', 'INSTANCE main component not found');
  }
  const root = findNode(working.document, component.rootFrameId);
  if (!root || root.type !== 'FRAME') {
    throw new ValidationErr('VALIDATION_ERROR', 'COMPONENT root frame missing');
  }
  return root;
}

/** Detach an INSTANCE in-place; returns the new FRAME node id (Figma `detachInstance`). */
export function detachInstanceInEnvelope(working: FileEnvelope, instanceId: string): string {
  const inst = findNode(working.document, instanceId);
  if (!inst || inst.type !== 'INSTANCE') {
    throw new ValidationErr('VALIDATION_ERROR', 'detachInstance requires INSTANCE node');
  }
  const parent = findParent(working.document, instanceId);
  if (!parent || parent.type === 'DOCUMENT') {
    throw new ValidationErr('VALIDATION_ERROR', 'detachInstance: instance has no parent');
  }
  const list =
    parent.type === 'PAGE'
      ? parent.children
      : (parent as FrameNode | TransformGroupNode | GroupNode | SectionNode).children;
  const idx = list.findIndex((c) => c.id === instanceId);
  if (idx < 0) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${instanceId}`);

  const masterRoot = resolveInstanceRootFrame(working, inst);
  const detached = cloneSceneSubtreeWithNewIds(working, masterRoot);
  detached.x = inst.x;
  detached.y = inst.y;
  detached.width = inst.width;
  detached.height = inst.height;
  detached.visible = true;
  detached.name = inst.name;

  list.splice(idx, 1);
  list.splice(idx, 0, detached);
  return detached.id;
}

function applyAutoLayoutChildDefaults(parent: FrameNode, child: SceneNode): void {
  if (parent.layoutMode !== 'HORIZONTAL' && parent.layoutMode !== 'VERTICAL') return;
  if (child.type !== 'TEXT') return;
  // Figma text in auto layout hugs content on both axes unless explicitly sized (textAutoResize).
  if (parent.layoutMode === 'HORIZONTAL') {
    if (child.layoutSizingHorizontal === undefined) child.layoutSizingHorizontal = 'HUG';
    if (child.layoutSizingVertical === undefined) child.layoutSizingVertical = 'HUG';
  } else {
    if (child.layoutSizingVertical === undefined) child.layoutSizingVertical = 'HUG';
    if (child.layoutSizingHorizontal === undefined) child.layoutSizingHorizontal = 'HUG';
  }
}

function detachSubtree(root: DocumentNode, nodeId: string): SceneNode {
  const parent = findParent(root, nodeId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);
  if (parent.type === 'DOCUMENT') {
    throw new ValidationErr('VALIDATION_ERROR', 'Cannot move PAGE via moveNode');
  }
  const list = parent.children;
  const idx = list.findIndex((c) => c.id === nodeId);
  if (idx < 0) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${nodeId}`);
  const [node] = list.splice(idx, 1);
  return node;
}

function attachSceneNode(root: DocumentNode, parentId: string, index: number | undefined, node: PageNode | SceneNode): void {
  const parent = findNode(root, parentId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown parent ${parentId}`);
  if (parent.type === 'DOCUMENT') {
    if (node.type !== 'PAGE') {
      throw new ValidationErr('VALIDATION_ERROR', `Cannot attach ${node.type} under DOCUMENT`);
    }
    insertAt(parent.children, index, node as PageNode);
    return;
  }
  if (parent.type === 'PAGE') {
    insertAt(parent.children, index, node);
    return;
  }
  if (parent.type === 'FRAME' || parent.type === 'TRANSFORM_GROUP' || parent.type === 'GROUP' || parent.type === 'SECTION') {
    insertAt(parent.children, index, node);
    return;
  }
  if (parent.type === 'BOOLEAN_OPERATION') {
    if (!isBooleanOperandType(node.type)) {
      throw new ValidationErr('VALIDATION_ERROR', `Cannot attach ${node.type} under BOOLEAN_OPERATION`);
    }
    insertAt(parent.children as unknown as SceneNode[], index, node);
    return;
  }
  throw new ValidationErr('VALIDATION_ERROR', `Invalid parent type ${parent.type}`);
}

/** Applies a single createNode on a working envelope (mutates). Returns the new node id. */
export function applyCreateNodeOp(working: FileEnvelope, op: Extract<SceneGraphOperation, { op: 'createNode' }>): string {
  const parent = findNode(working.document, op.parentId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown parent ${op.parentId}`);
  if (!parentAllowsChild(parent.type, op.node.type)) {
    throw new ValidationErr('VALIDATION_ERROR', `Cannot create ${op.node.type} under ${parent.type}`);
  }
  const id = `I${String(working.nextInternalId)}`;
  working.nextInternalId += 1;
  let node: PageNode | SceneNode;
  if (op.node.type === 'FRAME') {
    node = normalizeNewFrame(op.node, id, working);
  } else if (op.node.type === 'TEXT') {
    node = normalizeNewText(op.node, id, working);
  } else if (op.node.type === 'RECTANGLE') {
    node = normalizeNewRectangle(op.node, id, working);
  } else if (op.node.type === 'ELLIPSE') {
    node = normalizeNewEllipse(op.node, id, working);
  } else if (op.node.type === 'LINE') {
    node = normalizeNewLine(op.node, id, working);
  } else if (op.node.type === 'POLYGON') {
    node = normalizeNewPolygon(op.node, id, working);
  } else if (op.node.type === 'STAR') {
    node = normalizeNewStar(op.node, id, working);
  } else if (op.node.type === 'VECTOR') {
    node = normalizeNewVector(op.node, id, working);
  } else if (op.node.type === 'BOOLEAN_OPERATION') {
    node = normalizeNewBooleanOperation(op.node, id, working);
  } else if (op.node.type === 'TRANSFORM_GROUP') {
    node = normalizeNewTransformGroup(op.node, id, working);
  } else if (op.node.type === 'GROUP') {
    node = normalizeNewGroup(op.node, id, working);
  } else if (op.node.type === 'SLICE') {
    node = normalizeNewSlice(op.node, id, working);
  } else if (op.node.type === 'SECTION') {
    node = normalizeNewSection(op.node, id, working);
  } else if (op.node.type === 'TABLE') {
    node = normalizeNewTable(op.node, id, working);
  } else if (op.node.type === 'COMPONENT_INSTANCE') {
    node = normalizeNewComponentInstance(op.node, id, working);
  } else if (op.node.type === 'COMPONENT') {
    node = normalizeNewComponent(op.node, id, working);
  } else if (op.node.type === 'COMPONENT_SET') {
    node = normalizeNewComponentSet(op.node, id, working);
  } else if (op.node.type === 'INSTANCE') {
    node = normalizeNewInstance(op.node, id, working);
  } else if (op.node.type === 'PAGE') {
    node = normalizeNewPage(op.node, id);
  } else {
    throw new ValidationErr('VALIDATION_ERROR', `Unsupported node type ${(op.node as { type: string }).type}`);
  }
  attachSceneNode(working.document, op.parentId, op.index, node);
  if (parent.type === 'FRAME' && node.type !== 'PAGE') {
    applyAutoLayoutChildDefaults(parent, node);
  }
  if (node.type !== 'PAGE' && (sceneShapeTypes as readonly string[]).includes(node.type)) {
    validateLayoutSizingNodeContextForParent(working.document, node as SceneNode, parent);
  }
  return id;
}

/** Resolve a node in an in-memory envelope (document tree). */
export function findEnvelopeNode(working: FileEnvelope, nodeId: string): AnyTreeNode | null {
  return findNode(working.document, nodeId);
}

/**
 * Applies one validated engine operation to a working envelope (mutates).
 * Used by {@link DocumentEngine.applyTransaction} and the `use_figma` script sandbox for in-memory consistency.
 */
export function applyEngineOp(working: FileEnvelope, op: EngineOperation): string | undefined {
  if (isEnvelopeOperation(op)) {
    applyEnvelopeOperation(working, op);
    return undefined;
  }
  if (op.op === 'createNode') {
    return applyCreateNodeOp(working, op);
  }
  if (op.op === 'updateNode') {
    const node = findNode(working.document, op.nodeId);
    if (!node) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${op.nodeId}`);
    const matrix = ENGINE_MATRIX.patchKeysByType as Record<string, Set<string> | undefined>;
    const allowed = matrix[node.type];
    if (!allowed) throw new ValidationErr('UNSUPPORTED_OPERATION', `Patches on ${node.type} not supported`);
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(op.patch)) {
      if (EXCLUDED_PATCH_KEYS.has(k)) {
        throw new ValidationErr('VALIDATION_ERROR', `Forbidden key in patch: ${k}`);
      }
      if (!allowed.has(k)) {
        throw new ValidationErr('UNSUPPORTED_PROPERTY', `Unsupported patch key: ${k}`);
      }
      patch[k] = v;
    }
    applyPatch(working, node, patch);
    if ((sceneShapeTypes as readonly string[]).includes(node.type)) {
      applyLayoutSelfPatch(node as LayoutSelfFields, patch);
      if ('layoutSizingHorizontal' in patch || 'layoutSizingVertical' in patch) {
        const hint =
          'layoutSizingHorizontal' in patch
            ? ('layoutSizingHorizontal' as const)
            : ('layoutSizingVertical' as const);
        validateLayoutSizingNodeContextForParent(
          working.document,
          node as SceneNode,
          findParent(working.document, node.id),
          hint
        );
      }
    }
    if (node.type === 'FRAME') {
      const f = node;
      if ('primaryAxisSizingMode' in patch) {
        f.primaryAxisSizingMode = validateLayoutSizing(patch.primaryAxisSizingMode, 'primaryAxisSizingMode');
      }
      if ('counterAxisSizingMode' in patch) {
        f.counterAxisSizingMode = validateLayoutSizing(patch.counterAxisSizingMode, 'counterAxisSizingMode');
      }
    }
    if (node.type === 'TEXT' && 'fontName' in patch) {
      const t = node;
      const fn = patch.fontName;
      if (fn === undefined || fn === null) delete t.fontName;
      else t.fontName = validateFontName(fn, 'fontName');
    }
    return undefined;
  }
  if (op.op === 'deleteNode') {
    const target = findNode(working.document, op.nodeId);
    if (!target) throw new ValidationErr('UNKNOWN_NODE', `Unknown node ${op.nodeId}`);
    const targetNode = target;

    // Phase 9 — component master deletion cascade (prevent orphan component masters).
    // Minimal rule set:
    // - Deleting a COMPONENT deletes any INSTANCE/COMPONENT_INSTANCE nodes that reference it directly,
    //   and also deletes instances that reference a COMPONENT_SET containing it.
    // - Deleting a COMPONENT_SET deletes instances that reference that set directly.
    // - Deleting a COMPONENT also deletes its root master FRAME.
    const instanceIdsToDelete = new Set<string>();

    function walk(nodes: SceneNode[]): void {
      for (const n of nodes) {
        if (n.type === 'INSTANCE' || n.type === 'COMPONENT_INSTANCE') {
          const mid = (n as unknown as { mainComponentId: string }).mainComponentId;
          if (targetNode.type === 'COMPONENT_SET') {
            if (mid === targetNode.id) instanceIdsToDelete.add(n.id);
          } else if (targetNode.type === 'COMPONENT') {
            if (mid === targetNode.id) {
              instanceIdsToDelete.add(n.id);
            } else {
              // If instance targets a set that contains this component, also delete it.
              const maybeSet = findNode(working.document, mid);
              if (maybeSet && maybeSet.type === 'COMPONENT_SET') {
                if ((maybeSet as any).componentIds.includes(targetNode.id)) instanceIdsToDelete.add(n.id);
              }
            }
          }
        }

        if (n.type === 'FRAME' || n.type === 'TRANSFORM_GROUP' || n.type === 'GROUP' || n.type === 'SECTION') {
          walk((n as unknown as { children: SceneNode[] }).children);
        }
        if (n.type === 'BOOLEAN_OPERATION') {
          walk((n as unknown as { children: SceneNode[] }).children);
        }
      }
    }

    if (targetNode.type === 'COMPONENT' || targetNode.type === 'COMPONENT_SET') {
      for (const p of working.document.children) {
        walk(p.children);
      }

      for (const iid of instanceIdsToDelete) {
        removeNodeById(working.document, iid);
      }

      if (targetNode.type === 'COMPONENT') {
        const root = targetNode.rootFrameId;
        removeNodeById(working.document, root);
      }
    }

    removeNodeById(working.document, op.nodeId);
    return undefined;
  }
  if (op.op === 'detachInstance') {
    return detachInstanceInEnvelope(working, op.nodeId);
  }
  if (op.op === 'moveNode') {
    const subtree = detachSubtree(working.document, op.nodeId);
    const newParent = findNode(working.document, op.newParentId);
    if (!newParent) throw new ValidationErr('UNKNOWN_NODE', `Unknown new parent ${op.newParentId}`);
    if (!parentAllowsChild(newParent.type, subtree.type)) {
      throw new ValidationErr('VALIDATION_ERROR', `Cannot move ${subtree.type} under ${newParent.type}`);
    }
    attachSceneNode(working.document, op.newParentId, op.index, subtree);
    if (newParent.type === 'FRAME') {
      applyAutoLayoutChildDefaults(newParent, subtree);
    }
    if (newParent.type === 'GROUP') {
      syncGroupBounds(newParent);
    }
    if (newParent.type === 'BOOLEAN_OPERATION') {
      const b = newParent;
      subtree.x -= b.x;
      subtree.y -= b.y;
      syncBooleanOperationBounds(b);
    }
    return undefined;
  }
  return undefined;
}

function defaultWorkspaceDir(): string {
  if (process.env.HFC_WORKSPACE_DIR && process.env.HFC_WORKSPACE_DIR.trim() !== '') {
    return resolve(process.env.HFC_WORKSPACE_DIR);
  }
  return join(
    process.env.HOME ?? process.env.USERPROFILE ?? process.env.HOMEPATH ?? '.',
    '.headless-figma-clone',
    'workspace'
  );
}

/** Register image bytes on an in-memory envelope (script sandbox; no disk write). */
export function registerAssetBytesInEnvelope(
  working: FileEnvelope,
  buf: Buffer,
  mime: AssetRecord['mimeType']
): { hash: string; assetId: string } {
  const sha256 = createHash('sha256').update(buf).digest('hex');
  if (!working.assets) working.assets = { byId: {} };
  const ext =
    mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'gif';
  if (!working.assets.byId[sha256]) {
    working.assets.byId[sha256] = {
      id: sha256,
      mimeType: mime,
      byteLength: buf.length,
      sha256,
      relativePath: `sandbox/${sha256}.${ext}`,
    };
  }
  return { hash: sha256, assetId: sha256 };
}

/** Write asset sidecar bytes and point the envelope record at the persisted relative path. */
export async function persistAssetBytesOnDisk(
  filePath: string,
  working: FileEnvelope,
  buf: Buffer,
  mime: AssetRecord['mimeType']
): Promise<{ hash: string; assetId: string }> {
  const { hash, assetId } = registerAssetBytesInEnvelope(working, buf, mime);
  const ext =
    mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'gif';
  const rel = relativeAssetFile(filePath, hash, ext);
  const abs = join(dirname(filePath), rel);
  mkdirSync(sidecarDirForHfcJson(filePath), { recursive: true });
  if (!existsSync(abs)) {
    await atomicWriteFileBinary(abs, buf);
  }
  const rec = working.assets!.byId[hash]!;
  rec.relativePath = rel;
  return { hash, assetId };
}

export class DocumentEngine {
  private activeFile: FileEnvelope | null = null;
  private activeFilePath: string | null = null;
  private debugPreviewListener: ((envelope: FileEnvelope) => void) | null = null;

  constructor(
    private readonly deps: {
      persistence: PersistenceService;
      logger: Logger;
    }
  ) {}

  /** When set, invoked after the active envelope is committed (load, create, successful transaction). */
  attachDebugPreviewListener(listener: ((envelope: FileEnvelope) => void) | null): void {
    this.debugPreviewListener = listener;
  }

  private emitDebugPreview(): void {
    if (this.debugPreviewListener && this.activeFile) {
      this.debugPreviewListener(this.activeFile);
    }
  }

  getActiveFile(): FileEnvelope | null {
    return this.activeFile;
  }

  getActiveFilePath(): string | null {
    return this.activeFilePath;
  }

  queryNode(nodeId: string): AnyTreeNode | null {
    if (!this.activeFile) return null;
    return findNode(this.activeFile.document, nodeId);
  }

  async loadFromDisk(params: { absolutePath: string; save?: boolean }): Promise<void> {
    const env = await this.deps.persistence.load({ path: params.absolutePath });
    this.activeFile = env;
    this.activeFilePath = params.absolutePath;
    this.deps.logger.info('loaded file', { path: params.absolutePath, fileKey: env.fileKey });
    if (params.save) {
      await this.deps.persistence.save({ path: params.absolutePath, envelope: env });
    }
    this.emitDebugPreview();
  }

  /** Lists `.hfc.json` envelopes in the given workspace directory (non-recursive). */
  async listHfcFilesInWorkspace(absoluteWorkspaceDir: string): Promise<
    Array<{
      filePath: string;
      fileKey: string;
      fileName: string;
    }>
  > {
    const dir = resolve(absoluteWorkspaceDir);
    mkdirSync(dir, { recursive: true });
    const entries = await readdir(dir, { withFileTypes: true });
    const out: Array<{ filePath: string; fileKey: string; fileName: string }> = [];
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.hfc.json')) continue;
      const filePath = join(dir, e.name);
      try {
        const env = await this.deps.persistence.load({ path: filePath });
        out.push({ filePath, fileKey: env.fileKey, fileName: env.fileName });
      } catch {
        /* skip unreadable or invalid */
      }
    }
    out.sort((a, b) => a.filePath.localeCompare(b.filePath));
    return out;
  }

  async createEmptyFile(params: { fileName: string; directory?: string }): Promise<{ fileKey: string; filePath: string }> {
    const baseDir = params.directory !== undefined ? resolve(params.directory) : defaultWorkspaceDir();
    mkdirSync(baseDir, { recursive: true });
    const slug = params.fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 200) || 'Untitled';
    const fileKey = ulid();
    const filePath = join(baseDir, `${slug}.hfc.json`);

    const envelope: FileEnvelope = {
      schemaVersion: 1,
      fileKey,
      fileName: params.fileName,
      nextInternalId: 3,
      document: {
        id: 'I1',
        type: 'DOCUMENT',
        name: 'Document',
        children: [
          {
            id: 'I2',
            type: 'PAGE',
            name: 'Page 1',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            children: [],
          },
        ],
      },
    };

    this.activeFile = envelope;
    this.activeFilePath = filePath;
    await this.deps.persistence.save({ path: filePath, envelope });
    this.deps.logger.info('created new file', { filePath, fileKey });
    this.emitDebugPreview();
    return { fileKey, filePath };
  }

  private maxUploadBytes(): number {
    const maxBRaw = process.env.HFC_UPLOAD_MAX_BYTES;
    const maxB =
      maxBRaw && maxBRaw.trim() !== ''
        ? Number.parseInt(maxBRaw, 10)
        : 10 * 1024 * 1024;
    return Number.isFinite(maxB) && maxB > 0 ? maxB : 10 * 1024 * 1024;
  }

  private async commitRasterAssetBuffer(params: {
    buf: Buffer;
    mime: AssetRecord['mimeType'];
  }): Promise<
    | { ok: true; assetId: string; sha256: string; mimeType: string }
    | { ok: false; errorCode: EngineErrorCode; message: string }
  > {
    if (!this.activeFile || !this.activeFilePath) {
      return { ok: false, errorCode: 'NO_ACTIVE_FILE', message: 'No active file' };
    }
    const { buf, mime } = params;
    const sha256 = createHash('sha256').update(buf).digest('hex');

    if (!this.activeFile.assets) this.activeFile.assets = { byId: {} };
    const existing = this.activeFile.assets.byId[sha256];
    if (existing) {
      return { ok: true, assetId: existing.id, sha256: existing.sha256, mimeType: existing.mimeType };
    }

    try {
      await persistAssetBytesOnDisk(this.activeFilePath, this.activeFile, buf, mime);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: msg };
    }

    const record = this.activeFile.assets.byId[sha256]!;
    const abs = join(dirname(this.activeFilePath), record.relativePath);
    try {
      await this.deps.persistence.save({ path: this.activeFilePath, envelope: this.activeFile });
    } catch (e) {
      delete this.activeFile.assets.byId[sha256];
      try {
        unlinkSync(abs);
      } catch {
        /* ignore */
      }
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: msg };
    }
    this.emitDebugPreview();
    return { ok: true, assetId: record.id, sha256: record.sha256, mimeType: record.mimeType };
  }

  async uploadAssetFromDataUrl(params: { dataUrl: string }): Promise<
    | { ok: true; assetId: string; sha256: string; mimeType: string }
    | { ok: false; errorCode: EngineErrorCode; message: string }
  > {
    if (!this.activeFile || !this.activeFilePath) {
      return { ok: false, errorCode: 'NO_ACTIVE_FILE', message: 'No active file' };
    }
    const maxBytes = this.maxUploadBytes();

    const m = /^data:(image\/png|image\/jpeg|image\/gif|image\/webp);base64,(.*)$/is.exec(params.dataUrl.trim());
    if (!m) {
      return {
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'dataUrl must match data:image/(png|jpeg|gif|webp);base64,...',
      };
    }
    const mimeRaw = m[1]!.toLowerCase();
    const mime = mimeRaw as AssetRecord['mimeType'];
    let buf: Buffer;
    try {
      buf = Buffer.from(m[2]!, 'base64');
    } catch {
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: 'invalid base64 payload' };
    }
    if (buf.length === 0) {
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: 'empty asset' };
    }
    if (buf.length > maxBytes) {
      return {
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        message: `asset exceeds HFC_UPLOAD_MAX_BYTES (${String(maxBytes)})`,
      };
    }
    return this.commitRasterAssetBuffer({ buf, mime });
  }

  /** Reads a local PNG/JPEG/GIF/WebP file and registers it like {@link uploadAssetFromDataUrl}. */
  async uploadAssetFromFile(params: { absolutePath: string }): Promise<
    | { ok: true; assetId: string; sha256: string; mimeType: string }
    | { ok: false; errorCode: EngineErrorCode; message: string }
  > {
    if (!this.activeFile || !this.activeFilePath) {
      return { ok: false, errorCode: 'NO_ACTIVE_FILE', message: 'No active file' };
    }
    const maxBytes = this.maxUploadBytes();
    const ap = resolve(params.absolutePath);
    if (!existsSync(ap)) {
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: `file not found: ${ap}` };
    }
    let buf: Buffer;
    try {
      buf = readFileSync(ap);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: msg };
    }
    if (buf.length === 0) {
      return { ok: false, errorCode: 'VALIDATION_ERROR', message: 'empty asset' };
    }
    if (buf.length > maxBytes) {
      return {
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        message: `asset exceeds HFC_UPLOAD_MAX_BYTES (${String(maxBytes)})`,
      };
    }
    const ext = extname(ap).toLowerCase();
    let mime: AssetRecord['mimeType'] | null = null;
    if (ext === '.png') mime = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.gif') mime = 'image/gif';
    else if (ext === '.webp') mime = 'image/webp';
    if (!mime) {
      return {
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'filePath must end with .png, .jpg, .jpeg, .gif, or .webp',
      };
    }
    return this.commitRasterAssetBuffer({ buf, mime });
  }

  async applyTransaction(ops: EngineOperation[]): Promise<TransactionResult | TransactionFailure> {
    if (!this.activeFile || !this.activeFilePath) {
      return { success: false, errorCode: 'NO_ACTIVE_FILE', message: 'No active file' };
    }
    const working = deepClone(this.activeFile);
    const touched = new Set<string>();
    const warnings: string[] = [];

    try {
      for (const op of ops) {
        if (isAssetRegisterOperation(op)) {
          const buf = Buffer.from(op.dataBase64, 'base64');
          if (buf.length === 0) {
            throw new ValidationErr('VALIDATION_ERROR', 'registerAssetBytes: empty payload');
          }
          await persistAssetBytesOnDisk(this.activeFilePath, working, buf, op.mimeType);
          continue;
        }
        if (isEnvelopeOperation(op)) {
          applyEnvelopeOperation(working, op);
          if (op.op === 'createVariable') touched.add(op.variableId);
          else if (op.op === 'createVariableCollection') touched.add(op.collectionId);
          else if (op.op === 'createPaintStyle' || op.op === 'createTextStyle' || op.op === 'createEffectStyle' || op.op === 'createGridStyle') {
            touched.add(op.id);
          }
          continue;
        }
        if (op.op === 'createNode') {
          const id = applyEngineOp(working, op);
          if (id) touched.add(id);
        } else if (op.op === 'updateNode') {
          applyEngineOp(working, op);
          touched.add(op.nodeId);
        } else if (op.op === 'deleteNode') {
          applyEngineOp(working, op);
          touched.add(op.nodeId);
        } else if (op.op === 'moveNode') {
          applyEngineOp(working, op);
          touched.add(op.nodeId);
        }
      }
    } catch (e) {
      if (e instanceof ValidationErr) {
        return {
          success: false,
          errorCode: e.code,
          message: e.message,
        };
      }
      throw e;
    }

    this.activeFile = working;
    await this.deps.persistence.save({ path: this.activeFilePath, envelope: working });
    this.emitDebugPreview();
    return { success: true, touchedNodeIds: [...touched], warnings };
  }
}

const FRAME_BIND_FIELDS = new Set(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing']);
const TEXT_BIND_FIELDS = new Set(['fontSize', 'characters']);

function parseBoundVariablesPatch(
  env: FileEnvelope,
  raw: unknown,
  allowedFields: Set<string>,
  nodeLabel: string
): Record<string, string> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!isRecord(raw)) throw new ValidationErr('VALIDATION_ERROR', `${nodeLabel}.boundVariables must be object`);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowedFields.has(k)) {
      throw new ValidationErr('VALIDATION_ERROR', `${nodeLabel}.boundVariables: unsupported field ${k}`);
    }
    if (typeof v !== 'string') {
      throw new ValidationErr('VALIDATION_ERROR', `${nodeLabel}.boundVariables.${k} must be variable id string`);
    }
    const hit = findVariableDefinition(env, v);
    if (!hit) throw new ValidationErr('VALIDATION_ERROR', `${nodeLabel}.boundVariables.${k}: unknown variable ${v}`);
    const expectFloat = k !== 'characters';
    if (expectFloat && hit.variable.resolvedType !== 'FLOAT') {
      throw new ValidationErr('VALIDATION_ERROR', `${nodeLabel}.boundVariables.${k}: requires FLOAT variable`);
    }
    if (!expectFloat && hit.variable.resolvedType !== 'STRING') {
      throw new ValidationErr('VALIDATION_ERROR', `${nodeLabel}.boundVariables.${k}: requires STRING variable`);
    }
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function applyStrokeFieldsFromPatch(
  target: Record<string, unknown>,
  patch: Record<string, unknown>
): void {
  if ('strokeAlign' in patch) target.strokeAlign = patch.strokeAlign;
  if ('strokeCap' in patch) target.strokeCap = patch.strokeCap;
  if ('strokeJoin' in patch) target.strokeJoin = patch.strokeJoin;
  if ('miterLimit' in patch) target.miterLimit = patch.miterLimit;
  if ('dashPattern' in patch) target.dashPattern = patch.dashPattern;
}

function applyPatch(env: FileEnvelope, node: AnyTreeNode, patch: Record<string, unknown>): void {
  if (node.type === 'FRAME') {
    const f = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      f.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height', 'strokeWeight'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (f as unknown as Record<string, number>)[g] = v;
      }
    }
    validateFrameGeometry(f);
    if ('fills' in patch) {
      f.fills = validatePaintArray(patch.fills, 'fills', env);
    }
    if ('strokes' in patch) {
      f.strokes = validatePaintArray(patch.strokes, 'strokes', env);
    }
    if ('backgrounds' in patch) {
      f.backgrounds = validatePaintArray(patch.backgrounds, 'backgrounds', env);
    }
    if ('effects' in patch) {
      f.effects = validateEffects(patch.effects, 'effects');
    }
    if ('clipsContent' in patch) {
      if (typeof patch.clipsContent !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'clipsContent must be boolean');
      f.clipsContent = patch.clipsContent;
    }
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      f.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      f.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      f.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'FRAME.blendMode');
      f.blendMode = patch.blendMode as FrameNode['blendMode'];
    }
    if ('layoutMode' in patch) {
      f.layoutMode = patch.layoutMode as FrameNode['layoutMode'];
      validateOptionalLayoutMode(f.layoutMode);
    }
    if ('layoutWrap' in patch) {
      f.layoutWrap = patch.layoutWrap as FrameNode['layoutWrap'];
      validateOptionalLayoutWrap(f.layoutWrap);
    }
    if ('counterAxisAlignContent' in patch) {
      f.counterAxisAlignContent = patch.counterAxisAlignContent as FrameNode['counterAxisAlignContent'];
      validateOptionalCounterAxisAlignContent(f.counterAxisAlignContent);
    }
    if ('primaryAxisAlignItems' in patch) {
      f.primaryAxisAlignItems = patch.primaryAxisAlignItems as FrameNode['primaryAxisAlignItems'];
      validateOptionalPrimaryAxisAlignItems(f.primaryAxisAlignItems);
    }
    if ('counterAxisAlignItems' in patch) {
      f.counterAxisAlignItems = patch.counterAxisAlignItems as FrameNode['counterAxisAlignItems'];
      validateOptionalCounterAxisAlignItems(f.counterAxisAlignItems);
    }
    for (const k of [
      'paddingLeft',
      'paddingRight',
      'paddingTop',
      'paddingBottom',
      'itemSpacing',
      'counterAxisSpacing',
    ] as const) {
      if (k in patch) {
        const v = patch[k];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${k} must be number`);
        (f as unknown as Record<string, number>)[k] = v;
      }
    }
    if ('layoutGrids' in patch) {
      const raw = patch.layoutGrids;
      if (raw === undefined || raw === null) {
        delete f.layoutGrids;
      } else {
        const grids = normalizeLayoutGrids(raw, f.width, 'layoutGrids');
        if (grids === undefined) delete f.layoutGrids;
        else f.layoutGrids = grids;
      }
    }
    for (const key of ['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'] as const) {
      if (key in patch) {
        const v = patch[key];
        if (v === undefined || v === null) {
          delete f[key];
        } else {
          if (typeof v !== 'number' || v < 0) throw new ValidationErr('VALIDATION_ERROR', `${key} must be number >= 0`);
          f[key] = v;
        }
      }
    }
    validateLayoutNumbers(f);
    applyStrokeFieldsFromPatch(f as unknown as Record<string, unknown>, patch);
    validateStrokeGeometry('FRAME', f);
    if ('boundVariables' in patch) {
      const bv = parseBoundVariablesPatch(env, patch.boundVariables, FRAME_BIND_FIELDS, 'FRAME');
      if (bv === undefined) delete f.boundVariables;
      else f.boundVariables = bv as FrameVariableBindings;
    }
    return;
  }
  if (node.type === 'TEXT') {
    const t = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      t.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height', 'fontSize', 'fontWeight'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (t as unknown as Record<string, number>)[g] = v;
      }
    }
    validateTextGeometry(t);
    if ('characters' in patch) {
      if (typeof patch.characters !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'characters must be string');
      t.characters = patch.characters;
    }
    if ('styledSegments' in patch) {
      t.styledSegments = parseStyledSegments(patch.styledSegments) ?? [];
      validateStyledSegments(t.characters, t.styledSegments);
    }
    if ('fills' in patch) {
      t.fills = validatePaintArray(patch.fills, 'fills', env);
    }
    if ('effects' in patch) {
      t.effects = validateEffects(patch.effects, 'effects');
    }
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      t.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      t.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      t.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'TEXT.blendMode');
      t.blendMode = patch.blendMode as TextNode['blendMode'];
    }
    if ('textStyleId' in patch) {
      const ts = patch.textStyleId;
      if (ts === undefined || ts === null) {
        delete t.textStyleId;
      } else {
        if (typeof ts !== 'string' || !env.textStyles?.some((s) => s.id === ts)) {
          throw new ValidationErr('VALIDATION_ERROR', 'textStyleId must reference an existing text style');
        }
        t.textStyleId = ts;
      }
    }
    if ('textOnPath' in patch) {
      const top = patch.textOnPath;
      if (top === undefined || top === null) {
        delete t.textOnPath;
      } else {
        t.textOnPath = parseTextOnPath(top, 'textOnPath');
      }
    }
    if ('boundVariables' in patch) {
      const bv = parseBoundVariablesPatch(env, patch.boundVariables, TEXT_BIND_FIELDS, 'TEXT');
      if (bv === undefined) delete t.boundVariables;
      else t.boundVariables = bv as TextVariableBindings;
    }
    return;
  }
  if (node.type === 'RECTANGLE') {
    const r = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      r.name = patch.name;
    }
    for (const g of [
      'x',
      'y',
      'width',
      'height',
      'strokeWeight',
      'cornerRadius',
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius',
    ] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (r as unknown as Record<string, number>)[g] = v;
      }
    }
    validateShapeBox(r);
    if ('fills' in patch) r.fills = validatePaintArray(patch.fills, 'fills', env);
    if ('strokes' in patch) r.strokes = validatePaintArray(patch.strokes, 'strokes', env);
    if ('effects' in patch) r.effects = validateEffects(patch.effects, 'effects');
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      r.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      r.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      r.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'RECTANGLE.blendMode');
      r.blendMode = patch.blendMode as RectangleNode['blendMode'];
    }
    applyStrokeFieldsFromPatch(r as unknown as Record<string, unknown>, patch);
    validateStrokeGeometry('RECTANGLE', r);
    if ('fillStyleId' in patch) {
      const fs = patch.fillStyleId;
      if (fs === undefined || fs === null) {
        delete r.fillStyleId;
      } else {
        if (typeof fs !== 'string' || !env.paintStyles?.some((s) => s.id === fs)) {
          throw new ValidationErr('VALIDATION_ERROR', 'fillStyleId must reference an existing paint style');
        }
        r.fillStyleId = fs;
      }
    }
    if ('effectStyleId' in patch) {
      const es = patch.effectStyleId;
      if (es === undefined || es === null) {
        delete r.effectStyleId;
      } else {
        if (typeof es !== 'string' || !env.effectStyles?.some((s) => s.id === es)) {
          throw new ValidationErr('VALIDATION_ERROR', 'effectStyleId must reference an existing effect style');
        }
        r.effectStyleId = es;
      }
    }
    return;
  }
  if (node.type === 'ELLIPSE') {
    const e = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      e.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height', 'strokeWeight'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (e as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('arcData' in patch) e.arcData = patch.arcData as EllipseNode['arcData'];
    validateShapeBox(e);
    if ('fills' in patch) e.fills = validatePaintArray(patch.fills, 'fills', env);
    if ('strokes' in patch) e.strokes = validatePaintArray(patch.strokes, 'strokes', env);
    if ('effects' in patch) e.effects = validateEffects(patch.effects, 'effects');
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      e.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      e.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      e.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'ELLIPSE.blendMode');
      e.blendMode = patch.blendMode as EllipseNode['blendMode'];
    }
    applyStrokeFieldsFromPatch(e as unknown as Record<string, unknown>, patch);
    validateStrokeGeometry('ELLIPSE', e);
    return;
  }
  if (node.type === 'LINE') {
    const ln = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      ln.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height', 'strokeWeight'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (ln as unknown as Record<string, number>)[g] = v;
      }
    }
    validateShapeBox(ln);
    if ('strokes' in patch) {
      const arr = patch.strokes;
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new ValidationErr('VALIDATION_ERROR', 'LINE.strokes must be a non-empty array');
      }
      ln.strokes = validatePaintArray(arr, 'strokes', env) ?? [];
    }
    if ('effects' in patch) ln.effects = validateEffects(patch.effects, 'effects');
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      ln.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      ln.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      ln.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'LINE.blendMode');
      ln.blendMode = patch.blendMode as LineNode['blendMode'];
    }
    applyStrokeFieldsFromPatch(ln as unknown as Record<string, unknown>, patch);
    validateStrokeGeometry('LINE', ln);
    if (typeof ln.strokeWeight !== 'number' || ln.strokeWeight <= 0) {
      throw new ValidationErr('VALIDATION_ERROR', 'LINE.strokeWeight must stay positive');
    }
    return;
  }
  if (node.type === 'POLYGON') {
    const p = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      p.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height', 'strokeWeight'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (p as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('pointCount' in patch) {
      const pc = patch.pointCount;
      if (typeof pc !== 'number' || !Number.isInteger(pc) || pc < 3) {
        throw new ValidationErr('VALIDATION_ERROR', 'POLYGON.pointCount must be integer >= 3');
      }
      p.pointCount = pc;
    }
    validateShapeBox(p);
    if ('fills' in patch) p.fills = validatePaintArray(patch.fills, 'fills', env);
    if ('strokes' in patch) p.strokes = validatePaintArray(patch.strokes, 'strokes', env);
    if ('effects' in patch) p.effects = validateEffects(patch.effects, 'effects');
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      p.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      p.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      p.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'POLYGON.blendMode');
      p.blendMode = patch.blendMode as PolygonNode['blendMode'];
    }
    applyStrokeFieldsFromPatch(p as unknown as Record<string, unknown>, patch);
    validateStrokeGeometry('POLYGON', p);
    return;
  }
  if (node.type === 'STAR') {
    const s = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      s.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height', 'strokeWeight'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (s as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('pointCount' in patch) {
      const pc = patch.pointCount;
      if (typeof pc !== 'number' || !Number.isInteger(pc) || pc < 3) {
        throw new ValidationErr('VALIDATION_ERROR', 'STAR.pointCount must be integer >= 3');
      }
      s.pointCount = pc;
    }
    if ('innerRadius' in patch) {
      const ir = patch.innerRadius;
      if (typeof ir !== 'number' || ir < 0 || ir > 1 || !Number.isFinite(ir)) {
        throw new ValidationErr('VALIDATION_ERROR', 'STAR.innerRadius must be number 0..1');
      }
      s.innerRadius = ir;
    }
    validateShapeBox(s);
    if ('fills' in patch) s.fills = validatePaintArray(patch.fills, 'fills', env);
    if ('strokes' in patch) s.strokes = validatePaintArray(patch.strokes, 'strokes', env);
    if ('effects' in patch) s.effects = validateEffects(patch.effects, 'effects');
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      s.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      s.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      s.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'STAR.blendMode');
      s.blendMode = patch.blendMode as StarNode['blendMode'];
    }
    applyStrokeFieldsFromPatch(s as unknown as Record<string, unknown>, patch);
    validateStrokeGeometry('STAR', s);
    return;
  }
  if (node.type === 'VECTOR') {
    const v = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      v.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height', 'strokeWeight'] as const) {
      if (g in patch) {
        const val = patch[g];
        if (typeof val !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (v as unknown as Record<string, number>)[g] = val;
      }
    }
    if ('vectorPaths' in patch) {
      const arr = patch.vectorPaths;
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new ValidationErr('VALIDATION_ERROR', 'VECTOR.vectorPaths must be a non-empty array');
      }
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i] as unknown;
        if (!isRecord(p)) throw new ValidationErr('VALIDATION_ERROR', `vectorPaths[${String(i)}] invalid`);
        if (p.windingRule !== 'NONZERO' && p.windingRule !== 'EVENODD') {
          throw new ValidationErr('VALIDATION_ERROR', `vectorPaths[${String(i)}].windingRule invalid`);
        }
        if (typeof p.data !== 'string' || p.data.length === 0) {
          throw new ValidationErr('VALIDATION_ERROR', `vectorPaths[${String(i)}].data must be non-empty string`);
        }
      }
      const first = arr[0] as { windingRule: string; data: string };
      const normalized = normalizePathDataToOrigin(first.data);
      v.vectorPaths = [
        {
          windingRule: first.windingRule === 'EVENODD' ? 'EVENODD' : 'NONZERO',
          data: normalized.data,
        },
      ];
      v.width = normalized.width;
      v.height = normalized.height;
    }
    validateShapeBox(v);
    if ('fills' in patch) v.fills = validatePaintArray(patch.fills, 'fills', env);
    if ('strokes' in patch) v.strokes = validatePaintArray(patch.strokes, 'strokes', env);
    if ('effects' in patch) v.effects = validateEffects(patch.effects, 'effects');
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      v.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      v.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      v.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'VECTOR.blendMode');
      v.blendMode = patch.blendMode as VectorNode['blendMode'];
    }
    applyStrokeFieldsFromPatch(v as unknown as Record<string, unknown>, patch);
    validateStrokeGeometry('VECTOR', v);
    return;
  }
  if (node.type === 'BOOLEAN_OPERATION') {
    const b = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      b.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const val = patch[g];
        if (typeof val !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (b as unknown as Record<string, number>)[g] = val;
      }
    }
    if ('booleanOperation' in patch) {
      const bo = patch.booleanOperation;
      if (bo !== 'UNION' && bo !== 'SUBTRACT' && bo !== 'INTERSECT' && bo !== 'EXCLUDE') {
        throw new ValidationErr('VALIDATION_ERROR', 'booleanOperation invalid');
      }
      b.booleanOperation = bo;
    }
    validateShapeBox(b);
    if ('fills' in patch) b.fills = validatePaintArray(patch.fills, 'fills', env);
    if ('effects' in patch) b.effects = validateEffects(patch.effects, 'effects');
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      b.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      b.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      b.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'BOOLEAN_OPERATION.blendMode');
      b.blendMode = patch.blendMode as BooleanOperationNode['blendMode'];
    }
    return;
  }
  if (node.type === 'TRANSFORM_GROUP') {
    const tg = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      tg.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const val = patch[g];
        if (typeof val !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (tg as unknown as Record<string, number>)[g] = val;
      }
    }
    validateShapeBox(tg);
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      tg.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      tg.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      tg.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'TRANSFORM_GROUP.blendMode');
      tg.blendMode = patch.blendMode as TransformGroupNode['blendMode'];
    }
    if ('transformModifiers' in patch) {
      if (patch.transformModifiers === undefined || patch.transformModifiers === null) {
        delete tg.transformModifiers;
      } else {
        tg.transformModifiers = validateTransformModifiers(
          patch.transformModifiers,
          'TRANSFORM_GROUP.transformModifiers'
        );
      }
    }
    return;
  }
  if (node.type === 'GROUP' || node.type === 'SLICE' || node.type === 'SECTION') {
    const cn = node as GroupNode | SliceNode | SectionNode;
    const prevX = cn.x;
    const prevY = cn.y;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      cn.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const val = patch[g];
        if (typeof val !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (cn as unknown as Record<string, number>)[g] = val;
      }
    }
    validateShapeBox(cn);
    if (node.type === 'GROUP' && ('x' in patch || 'y' in patch)) {
      translateGroupDescendants(node, cn.x - prevX, cn.y - prevY);
      syncGroupBounds(node);
    }
    if (node.type === 'SECTION' && 'fills' in patch) {
      (node as SectionNode).fills = validatePaintArray(patch.fills, 'fills', env);
    }
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      cn.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      cn.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      cn.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, `${node.type}.blendMode`);
      cn.blendMode = patch.blendMode as GroupNode['blendMode'];
    }
    return;
  }
  if (node.type === 'TABLE') {
    const tb = node as TableNode;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      tb.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (tb as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('columnCount' in patch || 'rowCount' in patch || 'columnWidths' in patch || 'rowHeights' in patch || 'cells' in patch) {
      const cc = 'columnCount' in patch ? patch.columnCount : tb.columnCount;
      const rc = 'rowCount' in patch ? patch.rowCount : tb.rowCount;
      if (typeof cc !== 'number' || !Number.isInteger(cc) || cc < 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'TABLE.columnCount must be integer >= 1');
      }
      if (typeof rc !== 'number' || !Number.isInteger(rc) || rc < 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'TABLE.rowCount must be integer >= 1');
      }
      const cw = 'columnWidths' in patch ? patch.columnWidths : tb.columnWidths;
      const rh = 'rowHeights' in patch ? patch.rowHeights : tb.rowHeights;
      const cellsRaw = 'cells' in patch ? patch.cells : tb.cells;
      if (!Array.isArray(cw) || cw.length !== cc) {
        throw new ValidationErr('VALIDATION_ERROR', 'TABLE.columnWidths length must match columnCount');
      }
      if (!Array.isArray(rh) || rh.length !== rc) {
        throw new ValidationErr('VALIDATION_ERROR', 'TABLE.rowHeights length must match rowCount');
      }
      if (!Array.isArray(cellsRaw) || cellsRaw.length !== cc * rc) {
        throw new ValidationErr('VALIDATION_ERROR', 'TABLE.cells must have length columnCount * rowCount');
      }
      const cells: TableNode['cells'] = [];
      for (let i = 0; i < cellsRaw.length; i++) {
        const c = cellsRaw[i];
        if (!isRecord(c) || typeof c.text !== 'string') {
          throw new ValidationErr('VALIDATION_ERROR', `TABLE.cells[${String(i)}] must have text string`);
        }
        const fills = c.fills !== undefined ? validatePaintArray(c.fills, `TABLE.cells[${String(i)}].fills`, env) : undefined;
        cells.push({ text: c.text, fills });
      }
      tb.columnCount = cc;
      tb.rowCount = rc;
      tb.columnWidths = cw as number[];
      tb.rowHeights = rh as number[];
      tb.cells = cells;
    }
    validateShapeBox(tb);
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      tb.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      tb.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      tb.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'TABLE.blendMode');
      tb.blendMode = patch.blendMode as TableNode['blendMode'];
    }
    return;
  }
  if (node.type === 'COMPONENT_INSTANCE') {
    const ci = node as ComponentInstanceNode;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      ci.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (ci as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('mainComponentId' in patch) {
      const mid = patch.mainComponentId;
      if (typeof mid !== 'string' || !env.components?.some((c) => c.id === mid)) {
        throw new ValidationErr('VALIDATION_ERROR', 'mainComponentId must reference an existing component');
      }
      ci.mainComponentId = mid;
    }
    if ('overrides' in patch) {
      const ovr = patch.overrides;
      if (ovr === undefined || ovr === null) {
        delete ci.overrides;
      } else {
        if (!isRecord(ovr)) throw new ValidationErr('VALIDATION_ERROR', 'overrides must be object');
        const next: Record<string, import('../model/types.js').ComponentOverrideFields> = { ...(ci.overrides ?? {}) };
        for (const [nodeId, ov] of Object.entries(ovr)) {
          if (!/^I[0-9]+$/.test(nodeId)) {
            throw new ValidationErr('VALIDATION_ERROR', `overrides key invalid: ${nodeId}`);
          }
          if (!isRecord(ov)) throw new ValidationErr('VALIDATION_ERROR', `overrides.${nodeId} must be object`);
          const entry: import('../model/types.js').ComponentOverrideFields = { ...next[nodeId] };
          if ('characters' in ov) {
            if (typeof ov.characters !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'override.characters must be string');
            entry.characters = ov.characters;
          }
          if ('fontSize' in ov) {
            if (typeof ov.fontSize !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontSize must be number');
            entry.fontSize = ov.fontSize;
          }
          if ('fontWeight' in ov) {
            if (typeof ov.fontWeight !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontWeight must be number');
            entry.fontWeight = ov.fontWeight;
          }
          if ('fills' in ov && ov.fills !== undefined) {
            entry.fills = validatePaintArray(ov.fills, `overrides.${nodeId}.fills`, env);
          }
          next[nodeId] = entry;
        }
        ci.overrides = next;
      }
    }
    validateShapeBox(ci);
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      ci.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      ci.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      ci.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'COMPONENT_INSTANCE.blendMode');
      ci.blendMode = patch.blendMode as ComponentInstanceNode['blendMode'];
    }
    return;
  }
  if (node.type === 'COMPONENT') {
    const cn = node as import('../model/types.js').ComponentNode;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      cn.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (cn as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('rootFrameId' in patch) {
      const rid = patch.rootFrameId;
      const live = typeof rid === 'string' ? findNode(env.document, rid) : null;
      if (!live || live.type !== 'FRAME') {
        throw new ValidationErr('VALIDATION_ERROR', 'rootFrameId must reference an existing FRAME node');
      }
      cn.rootFrameId = rid as string;
    }
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      cn.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      cn.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      cn.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'COMPONENT.blendMode');
      cn.blendMode = patch.blendMode as import('../model/types.js').ComponentNode['blendMode'];
    }
    if ('componentPropertyDefinitions' in patch) {
      // Minimal validation: ensure it's either undefined/null or a record whose values have a `type` field.
      const cpd = patch.componentPropertyDefinitions;
      if (cpd === undefined || cpd === null) delete cn.componentPropertyDefinitions;
      else {
        if (!isRecord(cpd)) throw new ValidationErr('VALIDATION_ERROR', 'componentPropertyDefinitions must be object');
        for (const [k, v] of Object.entries(cpd)) {
          if (!isRecord(v) || typeof (v as Record<string, unknown>).type !== 'string') {
            throw new ValidationErr('VALIDATION_ERROR', `componentPropertyDefinitions.${k} must have type`);
          }
        }
        cn.componentPropertyDefinitions = cpd as import('../model/types.js').ComponentNode['componentPropertyDefinitions'];
      }
    }
    validateShapeBox(cn as unknown as import('../model/types.js').FrameNode);
    return;
  }
  if (node.type === 'COMPONENT_SET') {
    const cs = node as import('../model/types.js').ComponentSetNode;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      cs.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (cs as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      cs.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) {
        throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      }
      cs.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      cs.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'COMPONENT_SET.blendMode');
      cs.blendMode = patch.blendMode as import('../model/types.js').ComponentSetNode['blendMode'];
    }
    validateShapeBox(cs as unknown as import('../model/types.js').FrameNode);
    return;
  }
  if (node.type === 'INSTANCE') {
    const inst = node as import('../model/types.js').InstanceNode;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      inst.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (inst as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('mainComponentId' in patch) {
      const mid = patch.mainComponentId;
      const live = typeof mid === 'string' ? findNode(env.document, mid) : null;
      if (!live || (live.type !== 'COMPONENT' && live.type !== 'COMPONENT_SET')) {
        throw new ValidationErr('VALIDATION_ERROR', 'mainComponentId must reference an existing COMPONENT or COMPONENT_SET');
      }
      inst.mainComponentId = mid as string;
    }
    if ('overrides' in patch) {
      const ovr = patch.overrides;
      if (ovr === undefined || ovr === null) {
        delete inst.overrides;
      } else {
        if (!isRecord(ovr)) throw new ValidationErr('VALIDATION_ERROR', 'overrides must be object');
        const next: Record<string, import('../model/types.js').ComponentOverrideFields> = { ...(inst.overrides ?? {}) };
        for (const [nodeId, ov] of Object.entries(ovr)) {
          if (!/^I[0-9]+$/.test(nodeId)) throw new ValidationErr('VALIDATION_ERROR', `overrides key invalid: ${nodeId}`);
          if (!isRecord(ov)) throw new ValidationErr('VALIDATION_ERROR', `overrides.${nodeId} must be object`);
          const entry: import('../model/types.js').ComponentOverrideFields = { ...next[nodeId] };
          const r = ov as Record<string, unknown>;
          if ('characters' in r) {
            if (typeof r.characters !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'override.characters must be string');
            entry.characters = r.characters;
          }
          if ('fontSize' in r) {
            if (typeof r.fontSize !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontSize must be number');
            entry.fontSize = r.fontSize;
          }
          if ('fontWeight' in r) {
            if (typeof r.fontWeight !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'override.fontWeight must be number');
            entry.fontWeight = r.fontWeight;
          }
          if ('fills' in r && r.fills !== undefined) {
            entry.fills = validatePaintArray(r.fills as unknown, `overrides.${nodeId}.fills`, env);
          }
          next[nodeId] = entry;
        }
        inst.overrides = next;
      }
    }
    if ('componentProperties' in patch) {
      const cp = patch.componentProperties;
      if (cp === undefined || cp === null) {
        delete inst.componentProperties;
      } else {
        if (!isRecord(cp)) throw new ValidationErr('VALIDATION_ERROR', 'componentProperties must be object');
        const next: Record<string, import('../model/types.js').ComponentPropertyValue> = {};
        for (const [k, v] of Object.entries(cp)) {
          next[k] = validateComponentPropertyValue(v, `componentProperties.${k}`);
        }
        inst.componentProperties = next;
      }
    }
    validateShapeBox(inst as unknown as import('../model/types.js').FrameNode);
    if ('visible' in patch) {
      if (typeof patch.visible !== 'boolean') throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
      inst.visible = patch.visible;
    }
    if ('opacity' in patch) {
      if (typeof patch.opacity !== 'number' || patch.opacity < 0 || patch.opacity > 1) throw new ValidationErr('VALIDATION_ERROR', 'opacity must be number 0..1');
      inst.opacity = patch.opacity;
    }
    if ('rotation' in patch) {
      if (typeof patch.rotation !== 'number') throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
      inst.rotation = patch.rotation;
    }
    if ('blendMode' in patch) {
      validateBlendMode(patch.blendMode, 'INSTANCE.blendMode');
      inst.blendMode = patch.blendMode as import('../model/types.js').InstanceNode['blendMode'];
    }
    return;
  }
  if (node.type === 'PAGE') {
    const p = node;
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      p.name = patch.name;
    }
    for (const g of ['x', 'y', 'width', 'height'] as const) {
      if (g in patch) {
        const v = patch[g];
        if (typeof v !== 'number') throw new ValidationErr('VALIDATION_ERROR', `${g} must be number`);
        (p as unknown as Record<string, number>)[g] = v;
      }
    }
    if ('isPageDivider' in patch) {
      if (typeof patch.isPageDivider !== 'boolean') {
        throw new ValidationErr('VALIDATION_ERROR', 'isPageDivider must be boolean');
      }
      p.isPageDivider = patch.isPageDivider;
    }
    return;
  }
  if (node.type === 'DOCUMENT') {
    if ('name' in patch) {
      if (typeof patch.name !== 'string') throw new ValidationErr('VALIDATION_ERROR', 'name must be string');
      node.name = patch.name;
    }
    return;
  }
}
