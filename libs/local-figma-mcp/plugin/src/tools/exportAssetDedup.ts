import type { SerializedAsset, SerializedNode } from '../snapshotTypes.js';
import {
  tagSerializedIconPngExport,
  tagSerializedIconSvgExport,
} from './iconDetector.js';
import { bytesToBase64 } from './serializeValue.js';
import { sha256Hex } from './sha256.js';

export type NodeIconMime = 'image/svg+xml' | 'image/png';

/**
 * Content-addressed dedup for icon / mixed-fill vector exports.
 *
 * `hfcIconSvgAsset` / `hfcIconPngAsset` on the snapshot always store a **Figma node id**
 * (canonical export root), never an HFC `I…` id. Duplicates reuse the first exporter’s id.
 * Import maps that Figma id → SHA-256; HFC node ids are assigned separately at import.
 */
export class ExportAssetDedup {
  private readonly contentKeyToCanonical = new Map<string, string>();
  private readonly assets: SerializedAsset[] = [];
  private skippedDuplicates = 0;

  /** @returns true if this was a new unique asset (export ran); false if deduped to an existing one. */
  registerNodeExport(
    nodeId: string,
    bytes: Uint8Array,
    mimeType: NodeIconMime,
    document: SerializedNode,
    exportScale?: number
  ): boolean {
    const contentKey = exportContentKey(bytes, mimeType, exportScale);
    const canonical = this.contentKeyToCanonical.get(contentKey);
    if (canonical) {
      this.skippedDuplicates += 1;
      if (mimeType === 'image/png') {
        tagSerializedIconPngExport(document, nodeId, canonical);
      } else {
        tagSerializedIconSvgExport(document, nodeId, canonical);
      }
      return false;
    }

    const base64 = bytesToBase64(bytes);
    if (mimeType === 'image/png') {
      const asset: SerializedAsset = {
        figmaNodeId: nodeId,
        mimeType: 'image/png',
        base64,
        ...(exportScale !== undefined ? { exportScale } : {}),
      };
      this.assets.push(asset);
      tagSerializedIconPngExport(document, nodeId, nodeId);
    } else {
      this.assets.push({
        figmaNodeId: nodeId,
        mimeType: 'image/svg+xml',
        base64,
      });
      tagSerializedIconSvgExport(document, nodeId, nodeId);
    }

    this.contentKeyToCanonical.set(contentKey, nodeId);
    return true;
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
