import { mkdirSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ulid } from 'ulid';
import type { BaseNodePhase1, DocumentNode, FileEnvelope, FrameNode, PageNode } from '../model/types.js';
import type { Paint, SolidPaint } from '../model/types.js';
import type { PersistenceService } from '../persistence/JsonPersistence.js';
import type { Logger } from '../util/logger.js';
import { PHASE_MATRIX } from './phase-matrix.js';

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

export type EngineErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_NODE'
  | 'UNSUPPORTED_OPERATION'
  | 'UNSUPPORTED_PROPERTY'
  | 'PHASE_LOCKED'
  | 'CONSTRAINT_VIOLATION';

export type NewNodeSpec = Omit<FrameNode, 'id'> & { type: 'FRAME' };

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
]);

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function findNode(root: DocumentNode, id: string): BaseNodePhase1 | null {
  if (root.id === id) return root;
  for (const p of root.children) {
    if (p.id === id) return p;
    const hit = findInSceneList(p.children, id);
    if (hit) return hit;
  }
  return null;
}

function findInSceneList(nodes: FrameNode[], id: string): BaseNodePhase1 | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const inner = findInSceneList(n.children, id);
    if (inner) return inner;
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
  nodes: FrameNode[],
  id: string,
  parent: PageNode | FrameNode
): PageNode | FrameNode | null {
  for (const n of nodes) {
    if (n.id === id) return parent;
    const inner = findParentInFrames(n.children, id, n);
    if (inner) return inner;
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

export class ValidationErr extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ValidationErr';
  }
}

function assertSolidPaint(p: unknown, label: string): SolidPaint {
  if (!isRecord(p) || p.type !== 'SOLID') {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: only SOLID paints in phase 1`);
  }
  if (!isRecord(p.color)) throw new ValidationErr('VALIDATION_ERROR', `${label}: missing color`);
  validateRgb(p.color as { r: unknown; g: unknown; b: unknown }, `${label}.color`);
  return p as unknown as SolidPaint;
}

function validatePaintArray(arr: unknown, label: string): Paint[] | undefined {
  if (arr === undefined) return undefined;
  if (!Array.isArray(arr)) throw new ValidationErr('VALIDATION_ERROR', `${label}: must be array`);
  const max = PHASE_MATRIX[1].maxPaintsPerArray;
  if (arr.length > max) {
    throw new ValidationErr('VALIDATION_ERROR', `${label}: exceeds soft cap of ${String(max)}`);
  }
  return arr.map((p, i) => assertSolidPaint(p, `${label}[${String(i)}]`));
}

function validateFrameGeometry(n: Pick<FrameNode, 'width' | 'height'>): void {
  if (n.width < 0 || n.height < 0) {
    throw new ValidationErr('CONSTRAINT_VIOLATION', 'FRAME width/height must be >= 0');
  }
}

function normalizeNewFrame(spec: NewNodeSpec, id: string): FrameNode {
  const frame: FrameNode = {
    id,
    type: 'FRAME',
    name: typeof spec.name === 'string' && spec.name.length > 0 ? spec.name : 'Frame',
    x: typeof spec.x === 'number' ? spec.x : 0,
    y: typeof spec.y === 'number' ? spec.y : 0,
    width: typeof spec.width === 'number' ? spec.width : 100,
    height: typeof spec.height === 'number' ? spec.height : 100,
    children: Array.isArray(spec.children) ? (spec.children as FrameNode[]) : [],
    fills: spec.fills,
    strokes: spec.strokes,
    strokeWeight: spec.strokeWeight,
  };
  validateFrameGeometry(frame);
  if (frame.fills) frame.fills = validatePaintArray(frame.fills, 'fills') ?? [];
  if (frame.strokes) frame.strokes = validatePaintArray(frame.strokes, 'strokes') ?? [];
  if (frame.strokeWeight !== undefined && (typeof frame.strokeWeight !== 'number' || frame.strokeWeight < 0)) {
    throw new ValidationErr('VALIDATION_ERROR', 'strokeWeight must be number >= 0');
  }
  return frame;
}

function parentAllowsChild(parentType: string, childType: string, phase: 1): boolean {
  const rules = PHASE_MATRIX[phase].createNode.allowedChildPairs;
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

function detachSubtree(root: DocumentNode, nodeId: string): FrameNode {
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

function attachFrame(root: DocumentNode, parentId: string, index: number | undefined, node: FrameNode): void {
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
  throw new ValidationErr('VALIDATION_ERROR', `Invalid parent type ${parent.type} for FRAME`);
}

/** Applies a single createNode on a working envelope (mutates). Returns the new node id. */
export function applyCreateNodeOp(working: FileEnvelope, op: Extract<EngineOperation, { op: 'createNode' }>): string {
  const parent = findNode(working.document, op.parentId);
  if (!parent) throw new ValidationErr('UNKNOWN_NODE', `Unknown parent ${op.parentId}`);
  if (!parentAllowsChild(parent.type, op.node.type, 1)) {
    throw new ValidationErr('VALIDATION_ERROR', `Cannot create ${op.node.type} under ${parent.type}`);
  }
  const id = `I${String(working.nextInternalId)}`;
  working.nextInternalId += 1;
  const node = normalizeNewFrame(op.node as NewNodeSpec, id);
  if (parent.type === 'PAGE') {
    insertAt(parent.children, op.index, node);
  } else if (parent.type === 'FRAME') {
    insertAt(parent.children, op.index, node);
  } else {
    throw new ValidationErr('VALIDATION_ERROR', 'Invalid parent for FRAME');
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
      phase: 1 | 2 | 3 | 4 | 5;
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

  queryNode(nodeId: string): BaseNodePhase1 | null {
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
      return { success: false, errorCode: 'PHASE_LOCKED', message: 'No active file' };
    }
    const phase = this.deps.phase;
    if (phase !== 1) {
      return { success: false, errorCode: 'PHASE_LOCKED', message: 'Only phase 1 implemented' };
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
          const allowed = PHASE_MATRIX[1].patchKeysByType[node.type as 'FRAME' | 'PAGE' | 'DOCUMENT'];
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
          if (!parentAllowsChild(newParent.type, subtree.type, 1)) {
            throw new ValidationErr('VALIDATION_ERROR', `Cannot move FRAME under ${newParent.type}`);
          }
          attachFrame(working.document, op.newParentId, op.index, subtree);
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

function applyPatch(node: BaseNodePhase1, patch: Record<string, unknown>): void {
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
