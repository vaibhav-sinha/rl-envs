import type { SerializedAsset } from '../snapshotTypes.js';
import { bytesToBase64 } from './serializeValue.js';
import { sha256Hex } from './sha256.js';

export type NodeIconMime = 'image/svg+xml' | 'image/png';

export interface NodeExportRegistration {
  /** Whether a new unique asset was added (caller should emit `asset` line). */
  emitAsset: boolean;
  /** Canonical Figma node id for `hfcIcon*` tags and asset listing. */
  canonicalNodeId: string;
  mimeType: NodeIconMime;
  exportScale?: number;
}

/**
 * Content-addressed dedup for icon / mixed-fill vector exports.
 *
 * `hfcIconSvgAsset` / `hfcIconPngAsset` are emitted via `node_props` stream lines
 * (canonical export root Figma node id, never an HFC `I…` id).
 */
export class ExportAssetDedup {
  private readonly contentKeyToCanonical = new Map<string, string>();
  private readonly assets: SerializedAsset[] = [];
  private skippedDuplicates = 0;

  registerNodeExport(
    nodeId: string,
    bytes: Uint8Array,
    mimeType: NodeIconMime,
    exportScale?: number
  ): NodeExportRegistration {
    const contentKey = exportContentKey(bytes, mimeType, exportScale);
    const canonical = this.contentKeyToCanonical.get(contentKey);
    if (canonical) {
      this.skippedDuplicates += 1;
      return { emitAsset: false, canonicalNodeId: canonical, mimeType, exportScale };
    }

    const base64 = bytesToBase64(bytes);
    if (mimeType === 'image/png') {
      this.assets.push({
        figmaNodeId: nodeId,
        mimeType: 'image/png',
        base64,
        ...(exportScale !== undefined ? { exportScale } : {}),
      });
    } else {
      this.assets.push({
        figmaNodeId: nodeId,
        mimeType: 'image/svg+xml',
        base64,
      });
    }

    this.contentKeyToCanonical.set(contentKey, nodeId);
    return { emitAsset: true, canonicalNodeId: nodeId, mimeType, exportScale };
  }

  getAssets(): SerializedAsset[] {
    return this.assets;
  }

  get uniqueCount(): number {
    return this.assets.length;
  }

  get skippedDuplicateCount(): number {
    return this.skippedDuplicates;
  }
}

export function exportContentKey(
  bytes: Uint8Array,
  mimeType: NodeIconMime,
  exportScale?: number
): string {
  const scalePart = exportScale !== undefined ? `:scale=${exportScale}` : '';
  return `${mimeType}${scalePart}:${sha256Hex(bytes)}`;
}
