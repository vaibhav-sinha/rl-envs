import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAfKm7WQAAAABJRU5ErkJggg==';

const UNKNOWN_64 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

describe('asset registry resolve', () => {
  it('rejects createNode when ImagePaint references unknown hash', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-reg-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'Reg' });
      const snap = engine.getActiveFile();
      const before = snap ? JSON.parse(JSON.stringify(snap)) : null;
      const r = await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'RECTANGLE',
            name: 'BadImg',
            x: 0,
            y: 0,
            width: 4,
            height: 4,
            fills: [{ type: 'IMAGE', imageHash: UNKNOWN_64, scaleMode: 'FILL' }],
          },
        },
      ]);
      expect(r.success).toBe(false);
      expect(engine.getActiveFile()).toEqual(before);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('rolls back entire transaction when second op has invalid image paint', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-reg4-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'Reg4' });
      const snap = engine.getActiveFile();
      const before = snap ? JSON.parse(JSON.stringify(snap)) : null;
      const r = await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'RECTANGLE',
            name: 'Ok',
            x: 0,
            y: 0,
            width: 2,
            height: 2,
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
          },
        },
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'RECTANGLE',
            name: 'Bad',
            x: 2,
            y: 0,
            width: 2,
            height: 2,
            fills: [{ type: 'IMAGE', imageHash: UNKNOWN_64, scaleMode: 'FILL' }],
          },
        },
      ]);
      expect(r.success).toBe(false);
      expect(engine.getActiveFile()).toEqual(before);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('allows createNode after upload registers hash', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-reg2-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'Reg2' });
      const up = await engine.uploadAssetFromDataUrl({
        dataUrl: `data:image/png;base64,${TINY_PNG_B64}`,
      });
      expect(up.ok).toBe(true);
      if (!up.ok) return;
      const r = await engine.applyTransaction([
        {
          op: 'createNode',
          parentId: 'I2',
          node: {
            type: 'RECTANGLE',
            name: 'OkImg',
            x: 0,
            y: 0,
            width: 4,
            height: 4,
            fills: [{ type: 'IMAGE', imageHash: up.sha256, scaleMode: 'FILL' }],
          },
        },
      ]);
      expect(r.success).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('uploadAssetFromFile matches dataUrl upload idempotency', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-reg3-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const pngPath = join(base, 'one.png');
      writeFileSync(pngPath, Buffer.from(TINY_PNG_B64, 'base64'));
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'Reg3' });
      const a = await engine.uploadAssetFromFile({ absolutePath: pngPath });
      const b = await engine.uploadAssetFromDataUrl({
        dataUrl: `data:image/png;base64,${TINY_PNG_B64}`,
      });
      expect(a.ok && b.ok).toBe(true);
      if (a.ok && b.ok) {
        expect(a.sha256).toBe(b.sha256);
        expect(a.assetId).toBe(b.assetId);
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
