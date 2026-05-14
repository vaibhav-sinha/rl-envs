import { mkdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ulid } from 'ulid';
import type { DocumentNode, FileEnvelope, FrameNode, PageNode, SceneNode, TextNode } from '../model/types.js';
import type { Effect, Paint, SolidPaint, StyledSegment } from '../model/types.js';
import type { PersistenceService } from '../persistence/JsonPersistence.js';
import type { Logger } from '../util/logger.js';
import type { EngineErrorCode } from '../util/errors.js';
import { ValidationErr } from '../util/errors.js';
import { ENGINE_MATRIX } from './phase-matrix.js';
import { validateStyledSegments } from './utf16Segments.js';

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
  | (Omit<TextNode, 'id'> & { type: 'TEXT' });

export type EngineOperation =
  | { op: 'createNode'; parentId: string; index?: number; node: NewNodeSpec }
  | { op: 'updateNode'; nodeId: string; patch: Record<string, unknown> }
  | { op: 'deleteNode'; nodeId: string }
  | { op: 'moveNode'; nodeId: string; newParentId: string; index?: number };

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
    if (n.type === 'FRAME') {
      const inner = findInSceneList(n.children, id);
      if (inner) return inner;
    }
  }
  return null;
}

function findParent(root: DocumentNode, id: string): DocumentNode | PageNode | FrameNode | null {
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
  parent: PageNode | FrameNode
): PageNode | FrameNode | null {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.type === 'FRAME') {
      const inner = findParentInFrames(n.children, id, n);
      if (inner) return inner;
    }
  }
  return null;
}

function validateRgb(c: { r: unknown; g: unknown; b: unknown }, label: string): void {
  for (const k of ['r', 'g', 'b'] as const) {
    const v = c[k];
    if (typeof v !== 'number' || v < 0 || v > 1) {
      throw new ValidationErr('VALIDATION_ERROR', `${label}.${k} must be number 0..1`);
    }
  }
}

function assertSolidPaint(p: unknown, label: string): SolidPaint {
  if (!isRecord(p) || p.type !== 'SOLID') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: only SOLID paints supported`);
  }
  if (!isRecord(p.color)) throw new ValidationErr('VALIDATION_ERROR', `${label}: missing color`);
  validateRgb(p.color as { r: unknown; g: unknown; b: unknown }, `${label}.color`);
  return p as unknown as SolidPaint;
}

function validatePaintArray(arr: unknown, label: string): Paint[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw new ValidationErr('VALIDATION_ERROR', `${label}: must be array`);
  return arr.map((p, i) => assertSolidPaint(p, `${label}[${String(i)}]`));
}

function validateEffects(arr: unknown, label: string): Effect[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw new ValidationErr('VALIDATION_ERROR', `${label}: must be array`);
  const out: Effect[] = [];
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (!isRecord(e) || e.type !== 'DROP_SHADOW') {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}]: only DROP_SHADOW is supported`);
    }
    if (!isRecord(e.offset) || typeof e.offset.x !== 'number' || typeof e.offset.y !== 'number') {
      throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}]: DROP_SHADOW.offset {x,y} required`);
    }
    if (e.color !== undefined) {
      if (!isRecord(e.color)) throw new ValidationErr('VALIDATION_ERROR', `${label}[${String(i)}].color invalid`);
      validateRgb(e.color as { r: unknown; g: unknown; b: unknown }, `${label}[${String(i)}].color`);
    }
    out.push(e as unknown as Effect);
  }
  return out;
}

function parseStyledSegments(raw: unknown): StyledSegment[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) throw new ValidationErr('VALIDATION_ERROR', 'styledSegments must be array');
  const out: StyledSegment[] = [];
  for (let i = 0; i < raw.length; i++) {
    const s = raw[i];
    if (!isRecord(s) || typeof s.start !== 'number' || typeof s.end !== 'number' || !isRecord(s.style)) {
      throw new ValidationErr('VALIDATION_ERROR', `styledSegments[${String(i)}] invalid`);
    }
    out.push({
      start: s.start,
      end: s.end,
      style: s.style as StyledSegment['style'],
    });
  }
  return out;
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

function normalizeNewFrame(spec: Extract<NewNodeSpec, { type: 'FRAME' }>, id: string): FrameNode {
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
    fills: spec.fills,
    backgrounds: spec.backgrounds,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
    effects: spec.effects,
    clipsContent: spec.clipsContent,
    visible: spec.visible,
    opacity: spec.opacity,
    rotation: spec.rotation,
  };
  validateFrameGeometry(frame);
  if (frame.fills) frame.fills = validatePaintArray(frame.fills, 'fills') ?? [];
  if (frame.backgrounds) frame.backgrounds = validatePaintArray(frame.backgrounds, 'backgrounds') ?? [];
  if (frame.strokes) frame.strokes = validatePaintArray(frame.strokes, 'strokes') ?? [];
  if (frame.effects) frame.effects = validateEffects(frame.effects, 'effects') ?? [];
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
  return frame;
}

function normalizeNewText(spec: Extract<NewNodeSpec, { type: 'TEXT' }>, id: string): TextNode {
  const characters = typeof spec.characters === 'string' ? spec.characters : '';
  const styledSegments = spec.styledSegments;
  validateStyledSegments(characters, styledSegments);
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
  };
  validateTextGeometry(text);
  if (text.fills) text.fills = validatePaintArray(text.fills, 'fills') ?? [];
  if (text.effects) text.effects = validateEffects(text.effects, 'effects') ?? [];
  if (text.opacity !== undefined && (typeof text.opacity !== 'number' || text.opacity < 0 || text.opacity > 1)) {
    throw new ValidationErr('VALIDATION_ERROR', 'opacity must be 0..1');
  }
  if (text.rotation !== undefined && typeof text.rotation !== 'number') {
    throw new ValidationErr('VALIDATION_ERROR', 'rotation must be number');
  }
  if (text.visible !== undefined && typeof text.visible !== 'boolean') {
    throw new ValidationErr('VALIDATION_ERROR', 'visible must be boolean');
  }
  return text;
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

function attachSceneNode(root: DocumentNode, parentId: string, index: number | undefined, node: SceneNode): void {
  const parent = findNode(root, parentId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown parent ${parentId}`);
  if (parent.type === 'PAGE') {
    insertAt(parent.children, index, node);
    return;
  }
  if (parent.type === 'FRAME') {
    insertAt(parent.children, index, node);
    return;
  }
  throw new ValidationErr('VALIDATION_ERROR', `Invalid parent type ${parent.type}`);
}

/** Applies a single createNode on a working envelope (mutates). Returns the new node id. */
export function applyCreateNodeOp(working: FileEnvelope, op: Extract<EngineOperation, { op: 'createNode' }>): string {
  const parent = findNode(working.document, op.parentId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown parent ${op.parentId}`);
  if (!parentAllowsChild(parent.type, op.node.type)) {
    throw new ValidationErr('VALIDATION_ERROR', `Cannot create ${op.node.type} under ${parent.type}`);
  }
  const id = `I${String(working.nextInternalId)}`;
  working.nextInternalId += 1;
  let node: SceneNode;
  if (op.node.type === 'FRAME') {
    node = normalizeNewFrame(op.node, id);
  } else if (op.node.type === 'TEXT') {
    node = normalizeNewText(op.node, id);
  } else {
    throw new ValidationErr('VALIDATION_ERROR', `Unsupported node type ${(op.node as { type: string }).type}`);
  }
  if (parent.type === 'PAGE') {
    insertAt(parent.children, op.index, node);
  } else if (parent.type === 'FRAME') {
    insertAt(parent.children, op.index, node);
  } else {
    throw new ValidationErr('VALIDATION_ERROR', 'Invalid parent for scene node');
  }
  return id;
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

  async applyTransaction(ops: EngineOperation[]): Promise<TransactionResult | TransactionFailure> {
    if (!this.activeFile || !this.activeFilePath) {
      return { success: false, errorCode: 'NO_ACTIVE_FILE', message: 'No active file' };
    }
    const working = deepClone(this.activeFile);
    const touched = new Set<string>();
    const warnings: string[] = [];

    try {
      for (const op of ops) {
        if (op.op === 'createNode') {
          const id = applyCreateNodeOp(working, op);
          touched.add(id);
        } else if (op.op === 'updateNode') {
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
          applyPatch(node, patch);
          touched.add(node.id);
        } else if (op.op === 'deleteNode') {
          removeNodeById(working.document, op.nodeId);
          touched.add(op.nodeId);
        } else if (op.op === 'moveNode') {
          const subtree = detachSubtree(working.document, op.nodeId);
          const newParent = findNode(working.document, op.newParentId);
          if (!newParent) throw new ValidationErr('UNKNOWN_NODE', `Unknown new parent ${op.newParentId}`);
          if (!parentAllowsChild(newParent.type, subtree.type)) {
            throw new ValidationErr('VALIDATION_ERROR', `Cannot move ${subtree.type} under ${newParent.type}`);
          }
          attachSceneNode(working.document, op.newParentId, op.index, subtree);
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

function applyPatch(node: AnyTreeNode, patch: Record<string, unknown>): void {
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
      f.fills = validatePaintArray(patch.fills, 'fills');
    }
    if ('strokes' in patch) {
      f.strokes = validatePaintArray(patch.strokes, 'strokes');
    }
    if ('backgrounds' in patch) {
      f.backgrounds = validatePaintArray(patch.backgrounds, 'backgrounds');
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
      t.fills = validatePaintArray(patch.fills, 'fills');
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
