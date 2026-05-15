import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAfKm7WQAAAABJRU5ErkJggg==';

describe('persistence round-trip', () => {
  it('save and reload preserve envelope', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-rt-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      const { filePath } = await engine.createEmptyFile({ fileName: 'Rt' });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'FRAME',
            name: 'F',
            x: 1,
            y: 2,
            width: 10,
            height: 20,
            children: [],
          },
        },
      ]);
      const after = engine.getActiveFile();

      const engine2 = new DocumentEngine({ persistence, logger });
      await engine2.loadFromDisk({ absolutePath: filePath });
      const loaded = engine2.getActiveFile();
      expect(loaded).toEqual(after);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('round-trip preserves TEXT, effects, and backgrounds', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-rt2-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      const { filePath } = await engine.createEmptyFile({ fileName: 'Rt2' });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'FRAME',
            name: 'Chrome',
            x: 0,
            y: 0,
            width: 50,
            height: 40,
            children: [],
            backgrounds: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3 } }],
            effects: [{ type: 'DROP_SHADOW', offset: { x: 1, y: 2 }, radius: 3 }],
            clipsContent: true,
            rotation: 5,
          },
        },
        {
          op: 'createNode',
          parentId: 'I3',
          node: {
            type: 'TEXT',
            name: 'T',
            x: 1,
            y: 2,
            width: 40,
            height: 16,
            characters: 'ab',
            styledSegments: [{ start: 0, end: 1, style: { fontSize: 20 } }],
            effects: [{ type: 'DROP_SHADOW', offset: { x: 0, y: 0 }, radius: 1 }],
          },
        },
      ]);
      const after = engine.getActiveFile();
      const engine2 = new DocumentEngine({ persistence, logger });
      await engine2.loadFromDisk({ absolutePath: filePath });
      expect(engine2.getActiveFile()).toEqual(after);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('round-trip preserves uploaded asset sidecar, polygon, and linear gradient', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-rt3-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const engine = new DocumentEngine({ persistence, logger });
      const { filePath } = await engine.createEmptyFile({ fileName: 'Rt3' });
      const up = await engine.uploadAssetFromDataUrl({
        dataUrl: `data:image/png;base64,${TINY_PNG_B64}`,
      });
      expect(up.ok).toBe(true);
      if (!up.ok) return;
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'POLYGON',
            name: 'P',
            x: 0,
            y: 0,
            width: 12,
            height: 12,
            pointCount: 5,
            fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.6, b: 0.2 } }],
            strokeWeight: 2,
            dashPattern: [3, 2],
          },
        },
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'STAR',
            name: 'S',
            x: 20,
            y: 0,
            width: 14,
            height: 14,
            pointCount: 5,
            innerRadius: 0.4,
            fills: [{ type: 'IMAGE', imageHash: up.sha256, scaleMode: 'FILL' }],
          },
        },
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'RECTANGLE',
            name: 'G',
            x: 0,
            y: 20,
            width: 20,
            height: 10,
            fills: [
              {
                type: 'GRADIENT_LINEAR',
                gradientTransform: [
                  [1, 0, 0],
                  [0, 1, 0],
                ],
                gradientStops: [
                  { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
                  { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
                ],
              },
            ],
            blendMode: 'MULTIPLY',
          },
        },
      ]);
      const after = engine.getActiveFile();
      const rec = after?.assets?.byId[up.sha256];
      expect(rec).toBeTruthy();
      if (!rec) return;
      const absAsset = join(dirname(filePath), rec.relativePath);
      expect(existsSync(absAsset)).toBe(true);
      const diskBytes = readFileSync(absAsset);

      const engine2 = new DocumentEngine({ persistence, logger });
      await engine2.loadFromDisk({ absolutePath: filePath });
      const loaded = engine2.getActiveFile();
      expect(loaded).toEqual(after);
      const rec2 = loaded?.assets?.byId[up.sha256];
      expect(rec2).toBeTruthy();
      if (!rec2) return;
      const abs2 = join(dirname(filePath), rec2.relativePath);
      expect(readFileSync(abs2).equals(diskBytes)).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('round-trip preserves Phase 5 variable collections and components', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-rt-p5-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const logger = createConsoleLogger('error');
      const persistence = new JsonPersistence();
      const src = join(__dirname, '../fixtures/phase5-demo.hfc.json');
      const dest = join(base, 'demo.hfc.json');
      copyFileSync(src, dest);
      const engine = new DocumentEngine({ persistence, logger });
      await engine.loadFromDisk({ absolutePath: dest });
      await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I3',
          index: 0,
          node: {
            type: 'TABLE',
            name: 'Extra',
            x: 300,
            y: 300,
            width: 40,
            height: 40,
            columnCount: 1,
            rowCount: 1,
            columnWidths: [40],
            rowHeights: [40],
            cells: [{ text: 'x' }],
          },
        },
      ]);
      const after = engine.getActiveFile();
      const engine2 = new DocumentEngine({ persistence, logger });
      await engine2.loadFromDisk({ absolutePath: dest });
      const loaded = engine2.getActiveFile();
      expect(loaded).toEqual(after);
      expect(loaded?.document.children[0]?.children[0]?.children?.[0]?.type).toBe('TABLE');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
