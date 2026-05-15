import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

/** Minimal valid PNG (1×1), base64 only (no data: prefix). */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAfKm7WQAAAABJRU5ErkJggg==';

describe('upload_asset validation', () => {
  it('rejects invalid dataUrl', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-up-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'U' });
      const r = await engine.uploadAssetFromDataUrl({ dataUrl: 'not-a-data-url' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errorCode).toBe('VALIDATION_ERROR');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('accepts png dataUrl and returns sha256', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-up2-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'U2' });
      const r = await engine.uploadAssetFromDataUrl({
        dataUrl: `data:image/png;base64,${TINY_PNG_B64}`,
      });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(r.mimeType).toBe('image/png');
        expect(engine.getActiveFile()?.assets?.byId[r.sha256]).toBeTruthy();
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('accepts png via uploadAssetFromFile', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-up3-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const pngPath = join(base, 'disk.png');
      writeFileSync(pngPath, Buffer.from(TINY_PNG_B64, 'base64'));
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'U3' });
      const r = await engine.uploadAssetFromFile({ absolutePath: pngPath });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.mimeType).toBe('image/png');
        expect(engine.getActiveFile()?.assets?.byId[r.sha256]).toBeTruthy();
      }
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('rejects unsupported file extension', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-up4-'));
    try {
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const badPath = join(base, 'x.txt');
      writeFileSync(badPath, 'nope');
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'U4' });
      const r = await engine.uploadAssetFromFile({ absolutePath: badPath });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errorCode).toBe('VALIDATION_ERROR');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('rejects payload larger than HFC_UPLOAD_MAX_BYTES', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-up5-'));
    const prev = process.env.HFC_UPLOAD_MAX_BYTES;
    try {
      process.env.HFC_UPLOAD_MAX_BYTES = '8';
      process.env.HFC_WORKSPACE_DIR = join(base, 'ws');
      const engine = new DocumentEngine({ persistence: new JsonPersistence(), logger: createConsoleLogger('error') });
      await engine.createEmptyFile({ fileName: 'U5' });
      const big = Buffer.alloc(32, 7).toString('base64');
      const r = await engine.uploadAssetFromDataUrl({
        dataUrl: `data:image/png;base64,${big}`,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message).toMatch(/HFC_UPLOAD_MAX_BYTES/);
    } finally {
      if (prev === undefined) delete process.env.HFC_UPLOAD_MAX_BYTES;
      else process.env.HFC_UPLOAD_MAX_BYTES = prev;
      rmSync(base, { recursive: true, force: true });
    }
  });
});
