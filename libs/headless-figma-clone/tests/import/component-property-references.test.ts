import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { InstanceNode, TextNode } from '../../src/model/types.js';

const snapshot = parseFigmaPluginSnapshot({
  snapshotVersion: 1,
  exportedAt: '2026-05-22T00:00:00.000Z',
  figmaFileKey: 'test-cprop-refs',
  figmaFileName: 'Component Property References',
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
        properties: {
          absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 200 },
        },
        children: [
          {
            id: '1:1',
            type: 'COMPONENT',
            name: 'Chip',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 32 },
              componentKey: 'chip-key',
              componentPropertyDefinitions: {
                'Label#0:1': { type: 'TEXT', defaultValue: 'Default' },
                'Show icon#0:2': { type: 'BOOLEAN', defaultValue: true },
              },
            },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'Root',
                properties: {
                  absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 32 },
                },
                children: [
                  {
                    id: '1:3',
                    type: 'TEXT',
                    name: 'Label',
                    properties: {
                      absoluteBoundingBox: { x: 8, y: 8, width: 80, height: 16 },
                      characters: 'Default',
                      fontSize: 14,
                      componentPropertyReferences: { characters: 'Label#0:1' },
                    },
                  },
                  {
                    id: '1:4',
                    type: 'RECTANGLE',
                    name: 'Dot',
                    properties: {
                      absoluteBoundingBox: { x: 96, y: 12, width: 8, height: 8 },
                      visible: true,
                      componentPropertyReferences: { visible: 'Show icon#0:2' },
                      fills: [
                        {
                          type: 'SOLID',
                          color: { r: 0.2, g: 0.8, b: 0.3 },
                          visible: true,
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          {
            id: '2:1',
            type: 'INSTANCE',
            name: 'Chip / Custom',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 32 },
              mainComponentId: '1:1',
              componentProperties: {
                'Label#0:1': { type: 'TEXT', value: 'Hello world' },
                'Show icon#0:2': { type: 'BOOLEAN', value: false },
              },
            },
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

function findMasterText(envelope: ReturnType<typeof importFigmaPluginSnapshot>['envelope']): TextNode | undefined {
  const masters = envelope.document.children.find((p) => p.name === '__Component Masters');
  if (!masters) return undefined;
  const stack = [...masters.children];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.type === 'TEXT') return n;
    if (n.type === 'FRAME' || n.type === 'GROUP') stack.push(...n.children);
  }
  return undefined;
}

describe('componentPropertyReferences import + compile', () => {
  const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'CProp Refs' });

  it('imports references on component sublayers', () => {
    const label = findMasterText(envelope);
    expect(label?.componentPropertyReferences).toEqual({ characters: 'Label#0:1' });
  });

  it('applies instance componentProperties via references when compiling', () => {
    const page = envelope.document.children.find((p) => p.name === 'Page');
    const inst = page?.children.find((n) => n.type === 'INSTANCE') as InstanceNode | undefined;
    expect(inst?.componentProperties?.['Label#0:1']).toEqual({ type: 'TEXT', value: 'Hello world' });

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: inst!.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(out.html).toContain('Hello world');
    expect(out.html).not.toContain('Default');
  });
});
