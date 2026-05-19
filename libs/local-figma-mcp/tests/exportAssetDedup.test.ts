import { describe, expect, it } from 'vitest';
import { ExportAssetDedup, exportContentKey } from '../plugin/src/tools/exportAssetDedup.js';
import type { SerializedNode } from '../plugin/src/snapshotTypes.js';
import { sha256Hex } from '../plugin/src/tools/sha256.js';

function leaf(id: string, extra?: Record<string, unknown>): SerializedNode {
  return {
    id,
    type: 'FRAME',
    name: id,
    properties: { ...extra },
  };
}

describe('sha256Hex', () => {
  it('matches the empty-string SHA-256 digest', () => {
    expect(sha256Hex(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });
});

describe('ExportAssetDedup', () => {
  it('stores one asset and re-tags duplicates with the canonical figmaNodeId', () => {
    const document: SerializedNode = {
      id: '0:0',
      type: 'DOCUMENT',
      name: 'Document',
      properties: {},
      children: [leaf('1:1'), leaf('1:2')],
    };
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const dedup = new ExportAssetDedup();

    expect(dedup.registerNodeExport('1:1', bytes, 'image/svg+xml', document)).toBe(true);
    expect(dedup.registerNodeExport('1:2', bytes, 'image/svg+xml', document)).toBe(false);

    expect(dedup.getAssets()).toHaveLength(1);
    expect(dedup.getAssets()[0]).toMatchObject({ figmaNodeId: '1:1', mimeType: 'image/svg+xml' });
    expect(dedup.skippedDuplicateCount).toBe(1);
    expect(document.children![0]!.properties.hfcIconSvgAsset).toBe('1:1');
    expect(document.children![1]!.properties.hfcIconSvgAsset).toBe('1:1');
  });

  it('does not dedupe different export scales for PNG', () => {
    const document = leaf('doc');
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const dedup = new ExportAssetDedup();

    dedup.registerNodeExport('1:1', bytes, 'image/png', document, 2);
    dedup.registerNodeExport('1:2', bytes, 'image/png', document, 1);

    expect(dedup.getAssets()).toHaveLength(2);
    expect(exportContentKey(bytes, 'image/png', 2)).not.toBe(exportContentKey(bytes, 'image/png', 1));
  });
});
