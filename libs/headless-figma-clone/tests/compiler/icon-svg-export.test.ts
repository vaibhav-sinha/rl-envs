import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

describe('icon SVG export compile', () => {
  it('renders exported SVG asset instead of mask cluster HTML', () => {
    const raw = JSON.parse(readFileSync(join(fixturesDir, 'group-mask-icon.snapshot.json'), 'utf8'));
    const page = raw.document.children[0]!;
    const frame = page.children.find((n: { name: string }) => n.name === 'SearchIcon')!;
    frame.properties = { ...frame.properties, hfcIconSvgAsset: frame.id };

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
    const snapshot = {
      ...raw,
      assets: [
        {
          figmaNodeId: frame.id,
          mimeType: 'image/svg+xml' as const,
          base64: Buffer.from(svg, 'utf8').toString('base64'),
        },
      ],
    };

    const parsed = parseFigmaPluginSnapshot(snapshot);
    const { envelope } = importFigmaPluginSnapshot(parsed, { fileName: 'IconSvg' });
    const pageNode = envelope.document.children[0]!;
    const importedFrame = pageNode.children[0]!;
    expect(importedFrame.iconSvgAssetHash).toBeTruthy();

    const sha = importedFrame.iconSvgAssetHash!;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: importedFrame.id,
      options: {
        viewportPaddingPx: 0,
        includeCss: true,
        inlineCss: true,
        imageDataUrlByHash: { [sha]: dataUrl },
      },
    });

    expect(out.html).toContain('hfc-svg-icon');
    expect(out.html).toContain('data:image/svg+xml');
    expect(out.html).not.toContain('hfc-mask-wrap');
  });
});
