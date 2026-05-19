import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

/**
 * Icon asset resolution uses three separate identifiers:
 * - Snapshot `hfcIconSvgAsset` / `hfcIconPngAsset` → Figma node id (lookup key only)
 * - `assets[].figmaNodeId` → canonical Figma node id for that export blob
 * - Envelope `iconSvgAssetHash` → SHA-256 content hash (sidecar filename), not a node id
 * - Envelope `node.id` → HFC internal id (I1, I2, …); `sourceFigmaId` → Figma node id
 */
describe('icon asset resolution (Figma id vs HFC id)', () => {
  it('resolves deduped icons when duplicates point at canonical Figma node id', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    const base64 = Buffer.from(svg, 'utf8').toString('base64');
    const snapshot = {
      snapshotVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      figmaFileKey: null,
      figmaFileName: 'Dedup',
      document: {
        id: '0:0',
        type: 'DOCUMENT',
        name: 'Doc',
        properties: {},
        children: [
          {
            id: '0:1',
            type: 'PAGE',
            name: 'Page',
            properties: {},
            children: [
              {
                id: '1:1',
                type: 'FRAME',
                name: 'IconA',
                properties: { width: 24, height: 24, hfcIconSvgAsset: '1:1' },
              },
              {
                id: '1:2',
                type: 'FRAME',
                name: 'IconB',
                properties: { width: 24, height: 24, hfcIconSvgAsset: '1:1' },
              },
            ],
          },
        ],
      },
      variableCollections: [],
      paintStyles: [],
      textStyles: [],
      effectStyles: [],
      gridStyles: [],
      assets: [
        {
          figmaNodeId: '1:1',
          mimeType: 'image/svg+xml' as const,
          base64,
        },
      ],
    };

    const { envelope } = importFigmaPluginSnapshot(parseFigmaPluginSnapshot(snapshot), {
      fileName: 'Dedup',
    });
    const a = envelope.document.children[0]!.children![0]!;
    const b = envelope.document.children[0]!.children![1]!;

    expect(a.sourceFigmaId).toBe('1:1');
    expect(b.sourceFigmaId).toBe('1:2');
    expect(a.id).toMatch(/^I[0-9]+$/);
    expect(b.id).toMatch(/^I[0-9]+$/);
    expect(a.id).not.toBe(b.id);
    expect(a.iconSvgAssetHash).toBeTruthy();
    expect(a.iconSvgAssetHash).toBe(b.iconSvgAssetHash);
    expect(a.iconSvgAssetHash).not.toBe(a.id);
    expect(a.iconSvgAssetHash).not.toBe('1:1');
  });

  it('does not resolve when hfcIcon* mistakenly holds an HFC node id', () => {
    const snapshot = {
      snapshotVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      figmaFileKey: null,
      figmaFileName: 'WrongKey',
      document: {
        id: '0:0',
        type: 'DOCUMENT',
        name: 'Doc',
        properties: {},
        children: [
          {
            id: '0:1',
            type: 'PAGE',
            name: 'Page',
            properties: {},
            children: [
              {
                id: '1:1',
                type: 'FRAME',
                name: 'Icon',
                properties: { width: 24, height: 24, hfcIconSvgAsset: 'I99' },
              },
            ],
          },
        ],
      },
      variableCollections: [],
      paintStyles: [],
      textStyles: [],
      effectStyles: [],
      gridStyles: [],
      assets: [
        {
          figmaNodeId: '1:1',
          mimeType: 'image/svg+xml' as const,
          base64: Buffer.from('<svg/>', 'utf8').toString('base64'),
        },
      ],
    };

    const { envelope } = importFigmaPluginSnapshot(parseFigmaPluginSnapshot(snapshot), {
      fileName: 'WrongKey',
    });
    const node = envelope.document.children[0]!.children![0]!;
    expect(node.sourceFigmaId).toBe('1:1');
    expect(node.iconSvgAssetHash).toBeUndefined();
  });
});
