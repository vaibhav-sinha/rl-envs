import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { VectorNode } from '../../src/model/types.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

describe('mixed-fill vector SVG export compile', () => {
  it('renders exported SVG on VECTOR instead of transparent path compile', () => {
    const raw = JSON.parse(readFileSync(join(fixturesDir, 'group-mask-icon.snapshot.json'), 'utf8'));
    const page = raw.document.children[0]!;
    const vector: SerializedNodeLike = {
      id: '1:99',
      type: 'VECTOR',
      name: 'Check',
      properties: {
        width: 24,
        height: 24,
        hfcIconSvgAsset: '1:99',
        vectorPaths: [
          { windingRule: 'NONZERO', data: 'M 0 0 L 24 0 L 24 24 L 0 24 Z' },
          { windingRule: 'EVENODD', data: 'M 6 12 L 10 16 L 18 8 Z' },
        ],
      },
    };
    page.children = [
      {
        id: '1:row',
        type: 'FRAME',
        name: 'Row',
        properties: { width: 100, height: 24, layoutMode: 'HORIZONTAL' },
        children: [vector],
      },
    ];

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#000"/><path d="M6 12l4 4 8-8" fill="#fff"/></svg>';
    const snapshot = {
      ...raw,
      assets: [
        {
          figmaNodeId: vector.id,
          mimeType: 'image/svg+xml' as const,
          base64: Buffer.from(svg, 'utf8').toString('base64'),
        },
      ],
    };

    const parsed = parseFigmaPluginSnapshot(snapshot);
    const { envelope } = importFigmaPluginSnapshot(parsed, { fileName: 'MixedFillVector' });
    const imported = envelope.document.children[0]!.children![0]!.children![0] as VectorNode;
    expect(imported.type).toBe('VECTOR');
    expect(imported.iconSvgAssetHash).toBeTruthy();

    const sha = imported.iconSvgAssetHash!;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;

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
    expect(out.html).toContain('data:image/svg+xml');
    expect(out.html).not.toContain('hfc-vector-svg');
    expect(out.html).not.toContain('fill="transparent"');
  });
});

interface SerializedNodeLike {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  children?: SerializedNodeLike[];
}
