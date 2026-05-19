import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

describe('icon PNG @2x export compile', () => {
  it('renders exported PNG icon asset at layout size', () => {
    const milkIcon = {
      id: '1:211',
      type: 'COMPONENT',
      name: 'Type=default, Library=milk',
      properties: { width: 24, height: 24, hfcIconPngAsset: '1:211' },
      children: [],
    };
    const page = {
      id: '0:1',
      type: 'PAGE',
      name: 'Page',
      properties: {},
      children: [milkIcon],
    };
    const document = {
      id: '0:0',
      type: 'DOCUMENT',
      name: 'Doc',
      properties: {},
      children: [page],
    };
    const png48 = Buffer.alloc(48 * 48 * 4, 0);
    const snapshot = {
      snapshotVersion: 1 as const,
      exportedAt: new Date().toISOString(),
      figmaFileKey: null,
      figmaFileName: 'IconPng',
      document,
      variableCollections: [],
      paintStyles: [],
      textStyles: [],
      effectStyles: [],
      gridStyles: [],
      assets: [
        {
          figmaNodeId: '1:211',
          mimeType: 'image/png' as const,
          base64: png48.toString('base64'),
          exportScale: 2,
        },
      ],
    };

    const parsed = parseFigmaPluginSnapshot(snapshot);
    const { envelope } = importFigmaPluginSnapshot(parsed, { fileName: 'IconPng' });
    const imported = envelope.document.children[0]!.children[0]!;
    expect(imported.iconSvgAssetHash).toBeTruthy();

    const sha = imported.iconSvgAssetHash!;
    const dataUrl = `data:image/png;base64,${png48.toString('base64')}`;

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: imported.id,
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: { [sha]: dataUrl },
      },
    });

    expect(out.html).toContain('hfc-svg-icon');
    expect(out.html).toContain('data:image/png');
    expect(out.html).toContain('width="24"');
    expect(out.html).toContain('height="24"');
  });
});
