import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

const CATEGORY_L3_DETACH_CODE = `
const page = figma.root.children.find(p => p.name === 'Final design');
await figma.setCurrentPageAsync(page);
const row = await figma.getNodeByIdAsync('I38349');
const beforeId = row.id;
row.detachInstance();
const box = figma.createRectangle();
box.resize(8, 8);
row.appendChild(box);
return {
  sameId: beforeId === row.id,
  type: row.type,
  childCount: row.children.length,
  lastChildType: row.children[row.children.length - 1]?.type,
};
`.trim();

function withDesignFixture<T>(fn: (designPath: string) => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-oker-cat-l3-'));
  const ws = join(base, 'ws');
  const designPath = join(ws, 'design.hfc.json');
  const prev = process.env.HFC_WORKSPACE_DIR;
  return (async () => {
    try {
      mkdirSync(ws, { recursive: true });
      copyFileSync(designFixturePath, designPath);
      const assetsFixture = join(dirname(designFixturePath), 'design.hfc.assets');
      const assetsDest = join(dirname(designPath), 'design.hfc.assets');
      if (existsSync(assetsFixture)) {
        cpSync(assetsFixture, assetsDest, { recursive: true });
      }
      process.env.HFC_WORKSPACE_DIR = ws;
      return await fn(designPath);
    } finally {
      if (prev === undefined) delete process.env.HFC_WORKSPACE_DIR;
      else process.env.HFC_WORKSPACE_DIR = prev;
      rmSync(base, { recursive: true, force: true });
    }
  })();
}

describe('oker Category/L3 detach integration', () => {
  it('detachInstance succeeds for I38349 with bogus mainComponentId and stored children', async () => {
    await withDesignFixture(async (designPath) => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.loadFromDisk({ absolutePath: designPath, save: false });

      const run = await runUseFigmaScript(CATEGORY_L3_DETACH_CODE, engine);
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const r = run.result as {
        sameId: boolean;
        type: string;
        childCount: number;
        lastChildType: string;
      };
      expect(r.sameId).toBe(true);
      expect(r.type).toBe('FRAME');
      expect(r.childCount).toBeGreaterThan(1);
      expect(r.lastChildType).toBe('RECTANGLE');
    });
  }, 180_000);
});
