import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlForSubtree } from '../../src/render/imageDataUrls.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const designFixturePath = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

const BRAND_FAVICON_CLONE_CODE = `
const page = figma.root.children.find(p => p.name === 'Final design');
await figma.setCurrentPageAsync(page);
const icon = await figma.getNodeByIdAsync('I11242');
const wrapper = figma.createFrame();
wrapper.name = 'Brand icon clone wrapper';
wrapper.resize(icon.width, icon.height);
const clone = icon.clone();
wrapper.appendChild(clone);
page.appendChild(wrapper);
return { cloneId: clone.id, wrapperId: wrapper.id };
`.trim();

function withDesignFixture<T>(fn: (designPath: string) => Promise<T>): Promise<T> {
  const base = mkdtempSync(join(tmpdir(), 'hfc-brand-favicon-clone-'));
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

describe('oker BrandFavicon inner clone materialize', () => {
  it('cloned Rectangle 2851 renders IMAGE fill after reparent to page wrapper', async () => {
    await withDesignFixture(async (designPath) => {
      const engine = new DocumentEngine({
        persistence: new JsonPersistence(),
        logger: createConsoleLogger('error'),
      });
      await engine.loadFromDisk({ absolutePath: designPath, save: false });

      const run = await runUseFigmaScript(BRAND_FAVICON_CLONE_CODE, engine);
      expect(run.kind).toBe('ok');
      if (run.kind !== 'ok') return;

      const result = run.result as { cloneId: string; wrapperId: string };
      expect(result.cloneId).toBeTruthy();
      expect(result.wrapperId).toBeTruthy();

      const file = engine.getActiveFile()!;
      const compiled = designCompiler.compileSubtree({
        envelope: file,
        rootNodeId: result.wrapperId,
        options: {
          includeCss: true,
          inlineCss: true,
          imageDataUrlByHash: buildImageDataUrlForSubtree(file, designPath, result.wrapperId),
        },
      });

      expect(
        compiled.warnings.some((w) => w.startsWith(`missing_image_data_url:rect:${result.cloneId}`))
      ).toBe(false);
      expect(compiled.html).toContain('background-image');
    });
  }, 180_000);
});
