import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import type { FigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';

/**
 * Nested divider under a tab: detached child ids are deep (`…;13705:97345`).
 * Shallow first-segment matching wrongly picked OkerBottomNav; leaf + deep index picks Divider.
 */
const nestedDividerSnapshot: FigmaPluginSnapshot = {
  snapshotVersion: 1,
  exportedAt: '2026-05-23T00:00:00.000Z',
  figmaFileKey: 'nested-divider',
  figmaFileName: 'Nested Divider',
  document: {
    id: '0:0',
    type: 'DOCUMENT',
    name: 'Document',
    properties: {},
    children: [
      {
        id: '0:1',
        type: 'PAGE',
        name: 'Assets',
        properties: {
          absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 400 },
        },
        children: [
          {
            id: '100:1',
            type: 'COMPONENT',
            name: 'Property 1=Wireframe',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 360, height: 65 },
            },
            children: [
              {
                id: '100:2',
                type: 'INSTANCE',
                name: 'BottomNavigationTab',
                properties: {
                  absoluteBoundingBox: { x: 0, y: 0, width: 72, height: 65 },
                },
              },
            ],
          },
          {
            id: '200:1',
            type: 'COMPONENT',
            name: 'Divider',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 72, height: 1 },
            },
            children: [
              {
                id: '200:2',
                type: 'RECTANGLE',
                name: 'Rectangle 1',
                properties: {
                  absoluteBoundingBox: { x: 0, y: 0, width: 72, height: 1 },
                },
              },
            ],
          },
        ],
      },
      {
        id: '0:2',
        type: 'PAGE',
        name: 'Visual',
        properties: {
          absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 200 },
        },
        children: [
          {
            id: '300:1',
            type: 'INSTANCE',
            name: 'OkerBottomNav',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 360, height: 65 },
              mainComponentId: '100:1',
              componentProperties: {
                'Property 1': { type: 'VARIANT', value: 'Wireframe' },
              },
            },
            children: [
              {
                id: 'I300:1;100:2',
                type: 'INSTANCE',
                name: 'BottomNavigationTab',
                properties: {
                  absoluteBoundingBox: { x: 0, y: 0, width: 72, height: 65 },
                },
                children: [
                  {
                    id: 'I300:1;100:2;200:3',
                    type: 'INSTANCE',
                    name: 'Divider',
                    properties: {
                      absoluteBoundingBox: { x: 0, y: 0, width: 72, height: 1 },
                      componentProperties: {
                        Type: { type: 'VARIANT', value: 'Small' },
                      },
                    },
                    children: [
                      {
                        id: 'I300:1;100:2;200:3;200:2',
                        type: 'RECTANGLE',
                        name: 'Rectangle 1',
                        properties: {
                          absoluteBoundingBox: { x: 0, y: 0, width: 72, height: 1 },
                        },
                      },
                    ],
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
};

describe('detached child key resolution (nested divider)', () => {
  it('resolves nested Divider via leaf figma id, not OkerBottomNav wireframe', () => {
    const { envelope } = importFigmaPluginSnapshot(parseFigmaPluginSnapshot(nestedDividerSnapshot), {
      fileName: 'Nested Divider',
    });

    const findDividerUnderNav = (): { mainComponentId: string } | undefined => {
      const page = envelope.document.children.find((p) => p.name === 'Visual');
      if (!page) return undefined;
      const stack = [...page.children];
      while (stack.length) {
        const n = stack.pop()!;
        if (n.type === 'INSTANCE' && n.name === 'Divider') {
          return n;
        }
        if ('children' in n && Array.isArray(n.children)) {
          stack.push(...(n.children as typeof stack));
        }
      }
      return undefined;
    };

    const dividerInst = findDividerUnderNav();
    expect(dividerInst).toBeDefined();

    const findComp = (figmaId: string) => {
      const stack = envelope.document.children.flatMap((p) => p.children);
      while (stack.length) {
        const n = stack.pop()!;
        if (n.type === 'COMPONENT' && n.sourceFigmaId === figmaId) return n;
        if ('children' in n && Array.isArray(n.children)) stack.push(...(n.children as typeof stack));
      }
      return undefined;
    };

    const dividerComp = findComp('200:1');
    const navComp = findComp('100:1');
    expect(dividerComp).toBeDefined();
    expect(navComp).toBeDefined();
    expect(dividerInst!.mainComponentId).toBe(dividerComp!.id);
    expect(dividerInst!.mainComponentId).not.toBe(navComp!.id);
  });
});
