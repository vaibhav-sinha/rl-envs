import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  analyzeIconSubtree,
  findStructuralIconExportRootIds,
  isStructuralIconExportRoot,
  prefersRasterIconExport,
} from '../../src/import/iconDetector.js';
import type { SerializedNode } from '../../src/import/snapshotSchema.js';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/figma-export');

function loadSearchIconFrame(name: string): SerializedNode {
  const raw = JSON.parse(readFileSync(join(fixturesDir, name), 'utf8')) as {
    document: SerializedNode;
  };
  const page = raw.document.children![0]!;
  const frame = page.children!.find((n) => n.type === 'FRAME' && n.name === 'SearchIcon');
  if (!frame) throw new Error('SearchIcon frame not found in fixture');
  return frame;
}

describe('iconDetector', () => {
  it('detects mask+boolean icon fixture as export root', () => {
    const frame = loadSearchIconFrame('group-mask-icon.snapshot.json');
    const analysis = analyzeIconSubtree(frame);
    expect(analysis.hasMaskCluster).toBe(true);
    expect(analysis.booleans).toBeGreaterThan(0);
    expect(analysis.vectors).toBeGreaterThan(0);
    expect(isStructuralIconExportRoot(frame)).toBe(true);
    expect(findStructuralIconExportRootIds(frame)).toEqual([frame.id]);
  });

  it('does not treat large layout frames as icons', () => {
    const layout: SerializedNode = {
      id: '1:1',
      type: 'FRAME',
      name: 'Screen',
      properties: { width: 390, height: 844 },
      children: [
        {
          id: '1:2',
          type: 'TEXT',
          name: 'Title',
          properties: { width: 200, height: 40, characters: 'Hello' },
        },
      ],
    };
    expect(isStructuralIconExportRoot(layout)).toBe(false);
  });

  it('does not treat text-only compact frames as icons', () => {
    const label: SerializedNode = {
      id: '1:3',
      type: 'FRAME',
      name: 'Badge',
      properties: { width: 48, height: 24 },
      children: [
        {
          id: '1:4',
          type: 'TEXT',
          name: 'Text',
          properties: { width: 40, height: 20 },
        },
      ],
    };
    expect(isStructuralIconExportRoot(label)).toBe(false);
  });

  it('detects image-masked rectangle icon (no vectors)', () => {
    const icon: SerializedNode = {
      id: 'I211',
      type: 'COMPONENT',
      name: 'Type=default, Library=milk',
      properties: { width: 24, height: 24 },
      children: [
        {
          id: 'I212',
          type: 'FRAME',
          name: 'Type=default, Library=milk',
          properties: { width: 24, height: 24 },
          children: [
            {
              id: 'I213',
              type: 'GROUP',
              name: 'Mask Group',
              properties: { width: 20, height: 20 },
              children: [
                {
                  id: 'I214',
                  type: 'RECTANGLE',
                  name: 'packaging 1',
                  properties: {
                    width: 20,
                    height: 20,
                    isMask: true,
                    fills: [{ type: 'IMAGE', imageHash: 'abc' }],
                  },
                },
                {
                  id: 'I215',
                  type: 'RECTANGLE',
                  name: 'packaging 2',
                  properties: {
                    width: 20,
                    height: 20,
                    fills: [{ type: 'SOLID', color: { r: 0.7, g: 0.4, b: 0.3 } }],
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const analysis = analyzeIconSubtree(icon);
    expect(analysis.hasMaskCluster).toBe(true);
    expect(analysis.vectors).toBe(0);
    expect(analysis.booleans).toBe(0);
    expect(analysis.rectangles).toBe(2);
    expect(isStructuralIconExportRoot(icon)).toBe(true);
    expect(prefersRasterIconExport(icon)).toBe(true);
    expect(findStructuralIconExportRootIds(icon)).toEqual(['I211']);
  });

  it('vector mask icons prefer SVG export, not raster', () => {
    const frame = loadSearchIconFrame('group-mask-icon.snapshot.json');
    expect(isStructuralIconExportRoot(frame)).toBe(true);
    expect(prefersRasterIconExport(frame)).toBe(false);
  });

  it('keeps outermost qualifying root when nested', () => {
    const inner: SerializedNode = {
      id: '1:10',
      type: 'GROUP',
      name: 'Art',
      properties: { width: 20, height: 20, x: 2, y: 2 },
      children: [
        {
          id: '1:11',
          type: 'VECTOR',
          name: 'Clip',
          properties: { width: 20, height: 20, isMask: true, vectorPaths: [{ data: 'M0 0' }] },
        },
        {
          id: '1:12',
          type: 'BOOLEAN_OPERATION',
          name: 'Shape',
          properties: { width: 20, height: 20, booleanOperation: 'EXCLUDE' },
          children: [
            {
              id: '1:13',
              type: 'VECTOR',
              name: 'A',
              properties: { width: 10, height: 10, vectorPaths: [{ data: 'M0 0' }] },
            },
            {
              id: '1:14',
              type: 'VECTOR',
              name: 'B',
              properties: { width: 12, height: 12, vectorPaths: [{ data: 'M0 0' }] },
            },
          ],
        },
      ],
    };
    const outer: SerializedNode = {
      id: '1:1',
      type: 'FRAME',
      name: 'IconFrame',
      properties: { width: 24, height: 24 },
      children: [inner],
    };
    expect(isStructuralIconExportRoot(inner)).toBe(true);
    expect(isStructuralIconExportRoot(outer)).toBe(true);
    expect(findStructuralIconExportRootIds(outer)).toEqual(['1:1']);
  });
});
