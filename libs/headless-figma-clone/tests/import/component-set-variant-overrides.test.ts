import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { ComponentSetNode, InstanceNode, TextNode } from '../../src/model/types.js';

const snapshot = parseFigmaPluginSnapshot({
  snapshotVersion: 1,
  exportedAt: '2026-05-22T00:00:00.000Z',
  figmaFileKey: 'test-variant-overrides',
  figmaFileName: 'Variant Overrides',
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
            id: '10:0',
            type: 'COMPONENT_SET',
            name: 'Badge',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 80, height: 32 },
              componentPropertyDefinitions: {
                variant: { type: 'VARIANT', defaultValue: 'Small', variantOptions: ['Small', 'Large'] },
              },
            },
            children: [
              {
                id: '10:1',
                type: 'COMPONENT',
                name: 'Small',
                properties: { absoluteBoundingBox: { x: 0, y: 0, width: 60, height: 24 } },
                children: [
                  {
                    id: '10:1r',
                    type: 'FRAME',
                    name: 'Root',
                    properties: { absoluteBoundingBox: { x: 0, y: 0, width: 60, height: 24 } },
                    children: [
                      {
                        id: '10:1t',
                        type: 'TEXT',
                        name: 'Label',
                        properties: {
                          absoluteBoundingBox: { x: 4, y: 4, width: 40, height: 16 },
                          characters: 'S',
                          fontSize: 12,
                        },
                      },
                    ],
                  },
                ],
              },
              {
                id: '10:2',
                type: 'COMPONENT',
                name: 'Large',
                properties: { absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 40 } },
                children: [
                  {
                    id: '10:2r',
                    type: 'FRAME',
                    name: 'Root',
                    properties: { absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 40 } },
                    children: [
                      {
                        id: '10:2t',
                        type: 'TEXT',
                        name: 'Label',
                        properties: {
                          absoluteBoundingBox: { x: 8, y: 8, width: 80, height: 24 },
                          characters: 'L',
                          fontSize: 20,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: '20:0',
            type: 'INSTANCE',
            name: 'Badge / Large',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 120, height: 40 },
              mainComponentId: '10:0',
              componentProperties: {
                variant: { type: 'VARIANT', value: 'Large' },
              },
              overrides: {
                '10:1t': { characters: 'XL override' },
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

function findComponentSet(envelope: ReturnType<typeof importFigmaPluginSnapshot>['envelope']): ComponentSetNode | undefined {
  const page = envelope.document.children.find((p) => p.name === 'Page');
  return page?.children.find((n) => n.type === 'COMPONENT_SET') as ComponentSetNode | undefined;
}

function findInstance(envelope: ReturnType<typeof importFigmaPluginSnapshot>['envelope']): InstanceNode | undefined {
  const page = envelope.document.children.find((p) => p.name === 'Page');
  return page?.children.find((n) => n.type === 'INSTANCE') as InstanceNode | undefined;
}

function findTextInMasters(envelope: ReturnType<typeof importFigmaPluginSnapshot>['envelope'], characters: string): TextNode | undefined {
  const masters = envelope.document.children.find((p) => p.name === '__Component Masters');
  if (!masters) return undefined;
  const stack = [...masters.children];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.type === 'TEXT' && n.characters === characters) return n;
    if (n.type === 'FRAME' || n.type === 'GROUP') stack.push(...n.children);
  }
  return undefined;
}

describe('COMPONENT_SET nodeIdMapByComponentId + variant overrides', () => {
  const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Variant Overrides' });

  it('builds nodeIdMapByComponentId on import', () => {
    const set = findComponentSet(envelope);
    expect(set?.nodeIdMapByComponentId).toBeDefined();
    const smallId = set!.componentIds[0]!;
    const largeId = set!.componentIds[1]!;
    const smallText = findTextInMasters(envelope, 'S');
    const largeText = findTextInMasters(envelope, 'L');
    expect(smallText).toBeDefined();
    expect(largeText).toBeDefined();
    expect(set!.nodeIdMapByComponentId![smallId]![smallText!.id]).toBe(smallText!.id);
    expect(set!.nodeIdMapByComponentId![largeId]![smallText!.id]).toBe(largeText!.id);
  });

  it('applies base-keyed overrides on the selected variant at compile time', () => {
    const inst = findInstance(envelope);
    expect(inst?.mainComponentId).toBe(findComponentSet(envelope)?.id);

    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: inst!.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });

    expect(out.html).toContain('XL override');
    expect(out.html).not.toContain('>L<');
  });
});
