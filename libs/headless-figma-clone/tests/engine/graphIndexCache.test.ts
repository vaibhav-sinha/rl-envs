import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import * as nodeIndex from '../../src/engine/nodeIndex.js';
import { buildGraphIndexes } from '../../src/engine/nodeIndex.js';
import { collectMetadataTree } from '../../src/mcp/metadata.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

describe('DocumentEngine graph index cache', () => {
  it('reuses graph and ref indexes for the same active envelope', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-index-cache-'));
    const designPath = join(base, 'design.hfc.json');
    copyFileSync(designFixturePath, designPath);

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });

    try {
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      const firstGraph = engine.getGraphIndexes();
      const secondGraph = engine.getGraphIndexes();
      expect(secondGraph).toBe(firstGraph);

      const firstRef = engine.getNodeRefIndex();
      const secondRef = engine.getNodeRefIndex();
      expect(secondRef).toBe(firstRef);

      expect(engine.resolveSourceFigmaId('2176:169413')).toBeTruthy();
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('invalidates cache when the active envelope reference changes', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-index-cache-'));
    const designPath = join(base, 'design.hfc.json');
    copyFileSync(designFixturePath, designPath);

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });

    try {
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      const before = engine.getGraphIndexes();
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      const after = engine.getGraphIndexes();
      expect(after).not.toBe(before);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('collectMetadataTree reuses engine graph indexes when graph is passed', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-index-cache-'));
    const designPath = join(base, 'design.hfc.json');
    copyFileSync(designFixturePath, designPath);

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });

    try {
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      const graph = engine.getGraphIndexes();
      const page = engine.getActiveFile()!.document.children.find((c) => c.type === 'PAGE');
      expect(page).toBeDefined();

      const spy = vi.spyOn(nodeIndex, 'buildGraphIndexes');
      collectMetadataTree(page!, { graph, maxDepth: 1 });
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('runUseFigmaScript reuses cached indexes on subsequent calls', async () => {
    const base = mkdtempSync(join(tmpdir(), 'hfc-index-cache-'));
    const designPath = join(base, 'design.hfc.json');
    copyFileSync(designFixturePath, designPath);

    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });

    try {
      await engine.loadFromDisk({ absolutePath: designPath, save: false });
      engine.getGraphIndexes();

      const first = await runUseFigmaScript('return figma.root.name;', engine);
      expect(first.kind).toBe('ok');

      const cachedBefore = engine.getGraphIndexes();
      const t0 = performance.now();
      const second = await runUseFigmaScript('return figma.root.name;', engine);
      const elapsedMs = performance.now() - t0;
      expect(second.kind).toBe('ok');
      expect(engine.getGraphIndexes()).toBe(cachedBefore);
      expect(elapsedMs).toBeLessThan(500);

      const freshBuildMs = performance.now();
      buildGraphIndexes(engine.getActiveFile()!);
      const rebuildMs = performance.now() - freshBuildMs;
      expect(elapsedMs).toBeLessThan(rebuildMs * 0.5);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
