import { describe, expect, it } from 'vitest';
import { ExportAssetDedup, exportContentKey } from '../plugin/src/tools/exportAssetDedup.js';
import { sha256Hex } from '../plugin/src/tools/sha256.js';

describe('sha256Hex', () => {
  it('matches the empty-string SHA-256 digest', () => {
    expect(sha256Hex(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });
});

describe('ExportAssetDedup', () => {
  it('stores one asset and returns canonical id for duplicates', () => {
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const dedup = new ExportAssetDedup();

    const first = dedup.registerNodeExport('1:1', bytes, 'image/svg+xml');
    const second = dedup.registerNodeExport('1:2', bytes, 'image/svg+xml');

    expect(first.emitAsset).toBe(true);
    expect(first.canonicalNodeId).toBe('1:1');
    expect(second.emitAsset).toBe(false);
    expect(second.canonicalNodeId).toBe('1:1');

    expect(dedup.getAssets()).toHaveLength(1);
    expect(dedup.getAssets()[0]).toMatchObject({ figmaNodeId: '1:1', mimeType: 'image/svg+xml' });
    expect(dedup.skippedDuplicateCount).toBe(1);
  });

  it('does not dedupe different export scales for PNG', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const dedup = new ExportAssetDedup();

    const a = dedup.registerNodeExport('1:1', bytes, 'image/png', 2);
    const b = dedup.registerNodeExport('1:2', bytes, 'image/png', 1);

    expect(a.emitAsset).toBe(true);
    expect(b.emitAsset).toBe(true);
    expect(dedup.getAssets()).toHaveLength(2);
    expect(exportContentKey(bytes, 'image/png', 2)).not.toBe(exportContentKey(bytes, 'image/png', 1));
  });
});
