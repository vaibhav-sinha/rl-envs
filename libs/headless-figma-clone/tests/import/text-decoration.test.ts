import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';

const snapshot = {
  snapshotVersion: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  figmaFileKey: null,
  figmaFileName: 'Strike',
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
            name: 'Frame',
            properties: { width: 200, height: 80, x: 0, y: 0 },
            children: [
              {
                id: '2:1',
                type: 'TEXT',
                name: 'Strike',
                properties: {
                  characters: 'Sale price',
                  fontSize: 16,
                  width: 120,
                  height: 24,
                  x: 0,
                  y: 0,
                  textDecoration: 'STRIKETHROUGH',
                },
              },
              {
                id: '2:2',
                type: 'TEXT',
                name: 'Partial',
                properties: {
                  characters: 'Was $9 now $5',
                  fontSize: 16,
                  width: 160,
                  height: 24,
                  x: 0,
                  y: 32,
                  styledSegments: [
                    { start: 0, end: 7, textDecoration: 'STRIKETHROUGH' },
                    { start: 7, end: 14 },
                  ],
                },
              },
            ],
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
  assets: [],
};

describe('textDecoration import and compile', () => {
  it('maps node-level strikethrough and renders line-through', () => {
    const { envelope } = importFigmaPluginSnapshot(parseFigmaPluginSnapshot(snapshot), {
      fileName: 'strike',
    });
    const page = envelope.document.children[0]!;
    const frame = page.children[0];
    expect(frame?.type).toBe('FRAME');
    if (frame?.type !== 'FRAME') return;
    const whole = frame.children[0];
    expect(whole?.type).toBe('TEXT');
    if (whole?.type !== 'TEXT') return;
    expect(whole.textDecoration).toEqual({ type: 'STRIKETHROUGH' });

    const partial = frame.children[1];
    expect(partial?.type).toBe('TEXT');
    if (partial?.type !== 'TEXT') return;
    expect(partial.styledSegments?.[0]?.style.textDecoration).toEqual({ type: 'STRIKETHROUGH' });

    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: frame.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${compiled.html}\n${compiled.css}`;
    expect(blob).toContain('text-decoration-line:line-through');
  });
});
