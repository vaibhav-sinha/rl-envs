import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const PNG_1X1 = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0,
  0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45,
  180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

describe('Image handle API', () => {
  it('createImage exposes hash, getBytesAsync, and getSizeAsync before commit', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-img-handle-'));
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'img-handle', directory: baseDir });
    const expectedHash = createHash('sha256').update(PNG_1X1).digest('hex');
    const script = `
      const img = figma.createImage(new Uint8Array([${[...PNG_1X1].join(',')}]));
      const size = await img.getSizeAsync();
      const bytes = await img.getBytesAsync();
      return {
        hash: img.hash,
        width: size.width,
        height: size.height,
        byteLen: bytes.length,
        sameHash: img.hash === '${expectedHash}',
      };
    `;
    const { runUseFigmaScript } = await import('../../src/mcp/useFigmaScript.js');
    const run = await runUseFigmaScript(script, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const result = run.result as {
      hash?: string;
      width?: number;
      height?: number;
      byteLen?: number;
      sameHash?: boolean;
    };
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
    expect(result.byteLen).toBe(PNG_1X1.length);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sameHash).toBe(true);

    const tx = await engine.applyTransaction(run.operations);
    expect(tx.success).toBe(true);
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('getImageByHash returns null for unknown hash', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-img-miss-'));
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'img-miss', directory: baseDir });
    const script = `
      const img = figma.getImageByHash('deadbeef');
      return { found: img !== null };
    `;
    const { runUseFigmaScript } = await import('../../src/mcp/useFigmaScript.js');
    const run = await runUseFigmaScript(script, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    expect((run.result as { found?: boolean }).found).toBe(false);
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('getImageByHash returns bytes after createImage and commit', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-img-byhash-'));
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'img-byhash', directory: baseDir });
    const createScript = `
      const img = figma.createImage(new Uint8Array([${[...PNG_1X1].join(',')}]));
      return img.hash;
    `;
    const { runUseFigmaScript } = await import('../../src/mcp/useFigmaScript.js');
    const created = await runUseFigmaScript(createScript, engine);
    expect(created.kind).toBe('ok');
    if (created.kind !== 'ok') return;
    await engine.applyTransaction(created.operations);

    const hash = created.result as string;
    const readScript = `
      const img = figma.getImageByHash('${hash}');
      if (!img) return { ok: false };
      const bytes = await img.getBytesAsync();
      const size = await img.getSizeAsync();
      return { ok: true, byteLen: bytes.length, width: size.width, height: size.height };
    `;
    const read = await runUseFigmaScript(readScript, engine);
    expect(read.kind).toBe('ok');
    if (read.kind !== 'ok') return;
    const result = read.result as { ok?: boolean; byteLen?: number; width?: number; height?: number };
    expect(result.ok).toBe(true);
    expect(result.byteLen).toBe(PNG_1X1.length);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);

    const fp = engine.getActiveFilePath();
    const rec = engine.getActiveFile()!.assets!.byId[hash]!;
    const disk = readFileSync(join(dirname(fp!), rec.relativePath));
    expect(disk.equals(PNG_1X1)).toBe(true);
    rmSync(baseDir, { recursive: true, force: true });
  });
});
