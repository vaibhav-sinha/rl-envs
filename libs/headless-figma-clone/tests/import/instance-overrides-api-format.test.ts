import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

describe('INSTANCE Figma API overrides array', () => {
  it('infers cleared shell paints when overrides list fills but properties omit them', () => {
    const snapshot = parseFigmaPluginSnapshot({
      snapshotVersion: 1,
      exportedAt: '2026-05-22T00:00:00.000Z',
      figmaFileKey: 'test-overrides-api',
      figmaFileName: 'Overrides API',
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
            properties: { absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 200 } },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'Screen',
                properties: {
                  absoluteBoundingBox: { x: 0, y: 0, width: 328, height: 100 },
                },
                children: [
                  {
                    id: '1:3',
                    type: 'INSTANCE',
                    name: 'ClearedBtn',
                    properties: {
                      absoluteBoundingBox: { x: 0, y: 0, width: 328, height: 44 },
                      mainComponentId: '1:4',
                      overrides: [
                        {
                          id: '1:3',
                          overriddenFields: ['fills', 'strokes', 'backgrounds', 'effects'],
                        },
                      ],
                    },
                    children: [],
                  },
                  {
                    id: '1:4',
                    type: 'COMPONENT',
                    name: 'Secondary',
                    properties: {
                      absoluteBoundingBox: { x: 400, y: 0, width: 328, height: 44 },
                    },
                    children: [
                      {
                        id: '1:5',
                        type: 'FRAME',
                        name: 'Root',
                        properties: {
                          absoluteBoundingBox: { x: 0, y: 0, width: 328, height: 44 },
                          fills: [
                            {
                              type: 'SOLID',
                              color: { r: 1, g: 1, b: 1 },
                              visible: true,
                            },
                          ],
                          strokes: [
                            {
                              type: 'SOLID',
                              color: { r: 0.88, g: 0.88, b: 0.88 },
                              visible: true,
                            },
                          ],
                          strokeWeight: 1,
                          cornerRadius: 8,
                        },
                        children: [],
                      },
                    ],
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
    });

    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Overrides API' });
    const page = envelope.document.children.find((p) => p.name === 'Page');
    const screen = page?.children.find((c) => c.name === 'Screen');
    expect(screen?.type).toBe('FRAME');
    if (screen?.type !== 'FRAME') return;

    const inst = screen.children.find((c) => c.type === 'INSTANCE' && c.name === 'ClearedBtn');
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type !== 'INSTANCE') return;

    expect(inst.fills).toEqual([]);
    expect(inst.strokes).toEqual([]);
    expect(inst.backgrounds).toEqual([]);
    expect(inst.effects).toEqual([]);
  });

  it('infers cleared shell paints from expanded overrides map on instance id', () => {
    const snapshot = parseFigmaPluginSnapshot({
      snapshotVersion: 1,
      exportedAt: '2026-05-22T00:00:00.000Z',
      figmaFileKey: 'test-overrides-map',
      figmaFileName: 'Overrides Map',
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
            properties: { absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 200 } },
            children: [
              {
                id: '1:2',
                type: 'INSTANCE',
                name: 'ClearedBtn',
                properties: {
                  absoluteBoundingBox: { x: 0, y: 0, width: 328, height: 44 },
                  mainComponentId: '1:4',
                  overrides: {
                    '1:2': { fills: [], strokes: [] },
                  },
                },
                children: [],
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
    });

    const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Overrides Map' });
    const page = envelope.document.children.find((p) => p.name === 'Page');
    const inst = page?.children.find((c) => c.type === 'INSTANCE' && c.name === 'ClearedBtn');
    expect(inst?.type).toBe('INSTANCE');
    if (inst?.type !== 'INSTANCE') return;
    expect(inst.fills).toEqual([]);
    expect(inst.strokes).toEqual([]);
  });
});
