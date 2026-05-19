import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertFigmaSnapshot } from '../../src/import/exportHandler.js';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/figma-export'
);

describe('convertFigmaSnapshot with assetFiles', () => {
  it('reads icon bytes from disk paths', () => {
    const snapshot = JSON.parse(
      readFileSync(join(fixturesDir, 'minimal-frame.snapshot.json'), 'utf8')
    );
    const dir = mkdtempSync(join(tmpdir(), 'hfc-asset-files-'));
    const pngPath = join(dir, 'icon.png');
    const pngBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
    writeFileSync(pngPath, pngBytes);

    try {
      const converted = convertFigmaSnapshot({
        hfcFileName: 'AssetFilesTest',
        snapshot: { ...snapshot, assets: [] },
        assetFiles: [
          {
            path: pngPath,
            mimeType: 'image/png',
            figmaNodeId: '99:1',
            exportScale: 2,
          },
        ],
      });
      expect(converted.assets.length).toBe(1);
      expect(converted.assets[0]?.mimeType).toBe('image/png');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
