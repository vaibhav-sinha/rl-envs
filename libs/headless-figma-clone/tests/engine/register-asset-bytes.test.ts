import { mkdtempSync, rmSync } from 'node:fs';
import { readFileSync } from 'node:fs';
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

describe('registerAssetBytes script op', () => {
  it('persists createImage bytes through use_figma transaction', async () => {
    const baseDir = mkdtempSync(join(tmpdir(), 'hfc-asset-'));
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'asset-test', directory: baseDir });
    const script = `
      const img = figma.createImage(new Uint8Array([${[...PNG_1X1].join(',')}]));
      const root = figma.createFrame();
      root.resize(100, 100);
      const rect = figma.createRectangle();
      rect.resize(50, 50);
      rect.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
      root.appendChild(rect);
      figma.currentPage.appendChild(root);
      return { rootId: root.id, hash: img.hash };
    `;
    const { runUseFigmaScript } = await import('../../src/mcp/useFigmaScript.js');
    const run = await runUseFigmaScript(script, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const tx = await engine.applyTransaction(run.operations);
    expect(tx.success).toBe(true);
    const file = engine.getActiveFile();
    const fp = engine.getActiveFilePath();
    expect(file?.assets?.byId).toBeDefined();
    const hash = (run.result as { hash?: string })?.hash;
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const rec = file!.assets!.byId[hash!];
    expect(rec).toBeDefined();
    expect(rec!.relativePath).not.toContain('sandbox');
    const bytes = readFileSync(join(dirname(fp!), rec!.relativePath));
    expect(bytes.equals(PNG_1X1)).toBe(true);
    rmSync(baseDir, { recursive: true, force: true });
  });
});
