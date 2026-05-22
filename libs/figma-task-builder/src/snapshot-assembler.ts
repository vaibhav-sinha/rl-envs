import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { debugLogForExport, exportDebugEnabled, type ExportInstanceDebugLog } from './export-instance-debug.js';
import type { ExportTotals, SerializedNodeWire, StreamPart } from './stream-protocol.js';

export interface AssembledMeta {
  exportedAt: string;
  variableCollections: Record<string, unknown>[];
  paintStyles: Record<string, unknown>[];
  textStyles: Record<string, unknown>[];
  effectStyles: Record<string, unknown>[];
  gridStyles: Record<string, unknown>[];
}

export interface AssembledAsset {
  contentHash: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'image/svg+xml';
  /** Not retained during assembly; bytes live under session assets/ on disk. */
  figmaNodeId?: string;
  figmaImageHash?: string;
  exportScale?: number;
}

export interface AssembledSnapshot {
  snapshotVersion: number;
  figmaFileKey: string | null;
  figmaFileName: string;
  document: SerializedNodeWire & { children?: SerializedNodeWire[] };
  meta: AssembledMeta;
  assets: AssembledAsset[];
  sessionTotals?: ExportTotals;
}

type StackEntry = SerializedNodeWire & { children: SerializedNodeWire[] };

export class SnapshotAssembler {
  private stack: StackEntry[] = [];
  private documentRoot: StackEntry | null = null;
  private readonly nodeById = new Map<string, StackEntry>();
  private debugExportId: string | null = null;

  /** Optional: attach export session id for TB_EXPORT_DEBUG logs. */
  setDebugExportId(exportId: string | null): void {
    this.debugExportId = exportId;
  }

  private debug(): ExportInstanceDebugLog | null {
    if (!exportDebugEnabled() || !this.debugExportId) return null;
    return debugLogForExport(this.debugExportId);
  }
  private meta: AssembledMeta | null = null;
  private readonly assets: AssembledAsset[] = [];
  private snapshotVersion = 1;
  private figmaFileKey: string | null = null;
  private figmaFileName = 'Untitled';
  private sessionTotals: ExportTotals | null = null;

  applySessionStart(part: Extract<StreamPart, { kind: 'session_start' }>): void {
    this.snapshotVersion = part.snapshotVersion;
    this.figmaFileKey = part.figmaFileKey;
    this.figmaFileName = part.figmaFileName;
  }

  applySessionTotals(part: Extract<StreamPart, { kind: 'session_totals' }>): void {
    this.sessionTotals = {
      nodes: part.nodes,
      iconExports: part.iconExports,
      rasterImages: part.rasterImages,
    };
  }

  applyMeta(part: Extract<StreamPart, { kind: 'meta' }>): void {
    this.meta = {
      exportedAt: part.exportedAt,
      variableCollections: part.variableCollections,
      paintStyles: part.paintStyles,
      textStyles: part.textStyles,
      effectStyles: part.effectStyles,
      gridStyles: part.gridStyles,
    };
  }

  applyTreeEnter(part: Extract<StreamPart, { kind: 'tree_enter' }>): void {
    this.debug()?.logInstanceShell(
      'assembler_tree_enter',
      part.node.id,
      part.node.name,
      part.node.type,
      part.node.properties
    );
    const node: StackEntry = {
      id: part.node.id,
      type: part.node.type,
      name: part.node.name,
      properties: { ...part.node.properties },
      children: [],
    };
    const parent = this.stack[this.stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else if (!this.documentRoot) {
      this.documentRoot = node;
    }
    this.stack.push(node);
    this.nodeById.set(node.id, node);
  }

  applyTreeExit(): void {
    if (this.stack.length === 0) {
      throw new Error('TREE_EXIT_UNDERFLOW');
    }
    this.stack.pop();
  }

  applyNodeProps(part: Extract<StreamPart, { kind: 'node_props' }>): void {
    const node = this.nodeById.get(part.nodeId);
    if (!node) throw new Error(`NODE_PROPS_UNKNOWN_ID: ${part.nodeId}`);
    if (node.type === 'INSTANCE') {
      this.debug()?.logInstanceShell(
        'assembler_node_props_before',
        node.id,
        node.name,
        node.type,
        node.properties
      );
    }
    node.properties = { ...node.properties, ...part.properties };
    if (node.type === 'INSTANCE') {
      this.debug()?.logInstanceShell(
        'assembler_node_props_after',
        node.id,
        node.name,
        node.type,
        node.properties
      );
    }
  }

  applyAsset(part: Extract<StreamPart, { kind: 'asset' }>): void {
    this.assets.push({
      contentHash: part.contentHash,
      mimeType: part.mimeType,
      figmaNodeId: part.figmaNodeId,
      figmaImageHash: part.figmaImageHash,
      exportScale: part.exportScale,
    });
  }

  finish(): AssembledSnapshot {
    if (!this.documentRoot) throw new Error('ASSEMBLE_NO_DOCUMENT');
    if (!this.meta) throw new Error('ASSEMBLE_NO_META');
    if (this.stack.length !== 0) throw new Error('ASSEMBLE_UNCLOSED_TREE');

    const document = stripEmptyChildren(this.documentRoot);
    return {
      snapshotVersion: this.snapshotVersion,
      figmaFileKey: this.figmaFileKey,
      figmaFileName: this.figmaFileName,
      document,
      meta: this.meta,
      assets: this.assets,
      sessionTotals: this.sessionTotals ?? undefined,
    };
  }
}

function stripEmptyChildren(node: StackEntry): SerializedNodeWire & { children?: SerializedNodeWire[] } {
  const out: SerializedNodeWire & { children?: SerializedNodeWire[] } = {
    id: node.id,
    type: node.type,
    name: node.name,
    properties: node.properties,
  };
  if (node.children.length > 0) {
    out.children = node.children.map((ch) => stripEmptyChildren(ch as StackEntry));
  }
  return out;
}

export function assembledToFigmaPluginSnapshot(assembled: AssembledSnapshot): {
  snapshotVersion: number;
  exportedAt: string;
  figmaFileKey: string | null;
  figmaFileName: string;
  document: SerializedNodeWire & { children?: SerializedNodeWire[] };
  variableCollections: Record<string, unknown>[];
  paintStyles: Record<string, unknown>[];
  textStyles: Record<string, unknown>[];
  effectStyles: Record<string, unknown>[];
  gridStyles: Record<string, unknown>[];
  assets: Array<
    | { figmaImageHash: string; mimeType: AssembledAsset['mimeType']; base64: string }
    | { figmaNodeId: string; mimeType: 'image/svg+xml'; base64: string }
    | { figmaNodeId: string; mimeType: 'image/png'; base64: string; exportScale?: number }
  >;
} {
  const assets = assembled.assets.map((a) => {
    if (a.figmaImageHash) {
      return {
        figmaImageHash: a.figmaImageHash,
        mimeType: a.mimeType,
        base64: '',
      };
    }
    if (a.mimeType === 'image/png') {
      return {
        figmaNodeId: a.figmaNodeId!,
        mimeType: 'image/png' as const,
        base64: '',
        exportScale: a.exportScale,
      };
    }
    return {
      figmaNodeId: a.figmaNodeId!,
      mimeType: 'image/svg+xml' as const,
      base64: '',
    };
  });

  return {
    snapshotVersion: assembled.snapshotVersion,
    exportedAt: assembled.meta.exportedAt,
    figmaFileKey: assembled.figmaFileKey,
    figmaFileName: assembled.figmaFileName,
    document: assembled.document,
    variableCollections: assembled.meta.variableCollections,
    paintStyles: assembled.meta.paintStyles,
    textStyles: assembled.meta.textStyles,
    effectStyles: assembled.meta.effectStyles,
    gridStyles: assembled.meta.gridStyles,
    assets,
  };
}

export function hydrateAssetPartFromDisk(
  sessionDir: string,
  part: Extract<StreamPart, { kind: 'asset' }>
): Extract<StreamPart, { kind: 'asset' }> {
  if (part.bytesBase64) return part;
  const ext = assetMimeToExt(part.mimeType);
  const assetPath = join(sessionDir, 'assets', `${part.contentHash}.${ext}`);
  if (!existsSync(assetPath)) {
    throw new Error(`MISSING_ASSET_FILE: ${part.contentHash}`);
  }
  return {
    ...part,
    bytesBase64: readFileSync(assetPath).toString('base64'),
  };
}

function assetMimeToExt(mime: AssembledAsset['mimeType']): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'bin';
  }
}

/** Apply a parsed stream part to an assembler (shared by append and disk replay). */
export function applyStreamPart(assembler: SnapshotAssembler, part: StreamPart): void {
  switch (part.kind) {
    case 'session_start':
      assembler.applySessionStart(part);
      break;
    case 'session_totals':
      assembler.applySessionTotals(part);
      break;
    case 'meta':
      assembler.applyMeta(part);
      break;
    case 'tree_enter':
      assembler.applyTreeEnter(part);
      break;
    case 'tree_exit':
      assembler.applyTreeExit();
      break;
    case 'node_props':
      assembler.applyNodeProps(part);
      break;
    case 'asset':
      assembler.applyAsset(part);
      break;
    case 'session_end':
      break;
  }
}
