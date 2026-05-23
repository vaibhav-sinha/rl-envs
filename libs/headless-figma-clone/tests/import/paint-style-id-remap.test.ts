import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

describe('paint style id remap on import', () => {
  it('remaps strokeStyleId to HFC id matching paintStyles table', () => {
    const snapshot = parseFigmaPluginSnapshot({
      snapshotVersion: 1,
      exportedAt: '2026-05-22T00:00:00.000Z',
      figmaFileKey: 'test-paint-style',
      figmaFileName: 'Paint Style',
      document: {
        id: '0:0',
        type: 'DOCUMENT',
        name: 'Document',
        properties: {},
        children: [
          {
            id: '0:1',
            type: 'PAGE',
            name: 'Page',
            properties: { absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 } },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'Card',
                properties: {
                  absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                  fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }],
                  strokes: [],
                  strokeStyleId: 'S:abc123',
                  strokeWeight: 1,
                  strokeAlign: 'INSIDE',
                },
                children: [],
              },
            ],
          },
        ],
      },
      variableCollections: [],
      paintStyles: [
        {
          id: 'S:abc123',
          name: 'Border / Light',
          paints: [
            {
              type: 'SOLID',
              color: { r: 0.88, g: 0.88, b: 0.88 },
              visible: true,
            },
          ],
        },
      ],
      textStyles: [],
      effectStyles: [],
      gridStyles: [],
      assets: [],
    });

    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Paint Style' });
    const page = envelope.document.children.find((p) => p.name === 'Page');
    const frame = page?.children.find((c) => c.name === 'Card');
    expect(frame?.type).toBe('FRAME');
    if (frame?.type !== 'FRAME') return;

    expect(envelope.paintStyles).toHaveLength(1);
    expect(frame.strokeStyleId).toBe(envelope.paintStyles![0]!.id);
    expect(frame.strokeStyleId).not.toBe('S:abc123');

    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: frame.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: false },
    });
    expect(compiled.css).toMatch(/border:1px solid rgba\(224,224,224,1\)/);
  });
});
