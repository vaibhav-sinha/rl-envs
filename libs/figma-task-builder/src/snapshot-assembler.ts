import type { SerializedNodeWire, StreamPart } from './stream-protocol.js';

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
  bytesBase64: string;
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
}

type StackEntry = SerializedNodeWire & { children: SerializedNodeWire[] };

export class SnapshotAssembler {
  private stack: StackEntry[] = [];
  private documentRoot: StackEntry | null = null;
  private meta: AssembledMeta | null = null;
  private readonly assets: AssembledAsset[] = [];
  private snapshotVersion = 1;
  private figmaFileKey: string | null = null;
  private figmaFileName = 'Untitled';

  applySessionStart(part: Extract<StreamPart, { kind: 'session_start' }>): void {
    this.snapshotVersion = part.snapshotVersion;
    this.figmaFileKey = part.figmaFileKey;
    this.figmaFileName = part.figmaFileName;
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
    const node: StackEntry = {
      id: part.node.id,
      type: part.node.type,
      name: part.node.name,
      properties: part.node.properties,
      children: [],
    };
    const parent = this.stack[this.stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else if (!this.documentRoot) {
      this.documentRoot = node;
    }
    this.stack.push(node);
  }

  applyTreeExit(): void {
    if (this.stack.length === 0) {
      throw new Error('TREE_EXIT_UNDERFLOW');
    }
    this.stack.pop();
  }

  applyAsset(part: Extract<StreamPart, { kind: 'asset' }>): void {
    this.assets.push({
      contentHash: part.contentHash,
      mimeType: part.mimeType,
      bytesBase64: part.bytesBase64,
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
        base64: a.bytesBase64,
      };
    }
    if (a.mimeType === 'image/png') {
      return {
        figmaNodeId: a.figmaNodeId!,
        mimeType: 'image/png' as const,
        base64: a.bytesBase64,
        exportScale: a.exportScale,
      };
    }
    return {
      figmaNodeId: a.figmaNodeId!,
      mimeType: 'image/svg+xml' as const,
      base64: a.bytesBase64,
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
