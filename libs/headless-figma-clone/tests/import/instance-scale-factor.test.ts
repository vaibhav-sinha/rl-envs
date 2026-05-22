import { describe, expect, it } from 'vitest';
import { importFigmaPluginSnapshot } from '../../src/import/figmaPluginSnapshot.js';
import { parseFigmaPluginSnapshot } from '../../src/import/snapshotSchema.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { InstanceNode } from '../../src/model/types.js';

const snapshot = parseFigmaPluginSnapshot({
  snapshotVersion: 1,
  exportedAt: '2026-05-22T00:00:00.000Z',
  figmaFileKey: 'test-scale-factor',
  figmaFileName: 'Scale Factor',
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
            id: '1:1',
            type: 'COMPONENT',
            name: 'Box',
            properties: { absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 } },
            children: [
              {
                id: '1:2',
                type: 'FRAME',
                name: 'Root',
                properties: { absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 } },
                children: [
                  {
                    id: '1:3',
                    type: 'RECTANGLE',
                    name: 'Fill',
                    properties: {
                      absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 },
                      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, visible: true }],
                    },
                  },
                ],
              },
            ],
          },
          {
            id: '2:1',
            type: 'INSTANCE',
            name: 'Box scaled',
            properties: {
              absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
              mainComponentId: '1:1',
              scaleFactor: 2,
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

describe('INSTANCE scaleFactor', () => {
  const { envelope } = importFigmaPluginSnapshot(snapshot, { fileName: 'Scale Factor' });
  const inst = envelope.document.children[0]?.children.find((n) => n.type === 'INSTANCE') as
    | InstanceNode
    | undefined;

  it('imports scaleFactor from snapshot', () => {
    expect(inst?.scaleFactor).toBe(2);
  });

  it('does not emit CSS scale (exported width/height are already final layout bounds)', () => {
    const out = designCompiler.compileSubtree({
      envelope,
      rootNodeId: inst!.id,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const blob = `${out.css}\n${out.html}`;
    expect(blob).not.toMatch(/transform:[^;]*scale\(/);
    expect(blob).toContain('width:100px;height:100px');
  });
});
