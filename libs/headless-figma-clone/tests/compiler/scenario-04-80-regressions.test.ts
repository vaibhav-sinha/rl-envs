import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios');

describe('scenario 04 / 80 / 99 regressions', () => {
  it('04: absolute text gets non-zero width (no per-character wrap)', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: '04' });
    const run = await runUseFigmaScript(
      readFileSync(join(scenariosDir, '04-basic-text/script.js'), 'utf8'),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const tx = await engine.applyTransaction(run.operations);
    expect(tx.success).toBe(true);
    const file = engine.getActiveFile()!;
    const rootId = (run.result as { rootId: string }).rootId;
    const out = designCompiler.compileSubtree({
      envelope: file,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const m = out.html.match(/Hello Figma/);
    expect(m).toBeTruthy();
    const wm = out.html.match(/hfc-node-I4\{[^}]*width:([0-9.]+)px/);
    expect(wm).toBeTruthy();
    expect(Number(wm![1])).toBeGreaterThan(40);
  });

  it('80: toolbar row hugs height (not default 100) so inner stack does not overflow', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: '80' });
    const run = await runUseFigmaScript(
      readFileSync(join(scenariosDir, '80-grid-plus-autolayout/script.js'), 'utf8'),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const tx = await engine.applyTransaction(run.operations);
    expect(tx.success).toBe(true);
    const file = engine.getActiveFile()!;
    const rootId = (run.result as { rootId: string }).rootId;
    const out = designCompiler.compileSubtree({
      envelope: file,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    /** Inner auto-layout strip hugs to max child height (~32), not default 100×100 frame height. */
    expect(out.html).toMatch(/height:3[0-4]px/);
  });

  it("99: vertical task cards keep Figma's default fixed width (100) until resize", async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: '99' });
    const run = await runUseFigmaScript(
      readFileSync(join(scenariosDir, '99-kanban-variable-board/script.js'), 'utf8'),
      engine
    );
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;
    const tx = await engine.applyTransaction(run.operations);
    expect(tx.success).toBe(true);
    const file = engine.getActiveFile()!;
    const rootId = (run.result as { rootId: string }).rootId;
    const out = designCompiler.compileSubtree({
      envelope: file,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    expect(out.html).toMatch(
      /flex:0 0 \d+px;min-height:0;width:100px;box-sizing:border-box;background-color:rgba\(255,255,255,1\)/
    );
  });
});
