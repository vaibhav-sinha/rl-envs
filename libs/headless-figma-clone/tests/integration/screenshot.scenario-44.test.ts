import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { runUseFigmaScript } from '../../src/mcp/useFigmaScript.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { compileSubtreeForScreenshot } from '../../src/render/compileForScreenshot.js';
import { playwrightScreenshotService, __closeTestBrowser } from '../../src/screenshot/PlaywrightScreenshotService.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), '../../verification/scenarios');

describe('scenario 44 component instance screenshot', () => {
  afterAll(async () => {
    await __closeTestBrowser();
  });

  it('screenshot shows button inside instance', async () => {
    const engine = new DocumentEngine({
      persistence: new JsonPersistence(),
      logger: createConsoleLogger('error'),
    });
    await engine.createEmptyFile({ fileName: 'T' });
    const code = readFileSync(join(scenariosDir, '44-component-instance/script.js'), 'utf8');
    const run = await runUseFigmaScript(code, engine);
    expect(run.kind).toBe('ok');
    if (run.kind !== 'ok') return;

    const tx = await engine.applyTransaction(run.operations);
    expect(tx.success).toBe(true);

    const file = engine.getActiveFile()!;
    const rootId = (run.result as { rootId: string }).rootId;
    const compiled = await compileSubtreeForScreenshot({
      envelope: file,
      rootNodeId: rootId,
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
      screenshot: playwrightScreenshotService,
      screenshotTimeoutMs: 30_000,
    });

    expect(compiled.html).toContain('Button');
    expect(compiled.html.split('hfc-component-instance')[1] ?? '').not.toContain('display:none');

    const shot = await playwrightScreenshotService.capture({
      compiled,
      clipRect: compiled.rootClip,
      format: 'png',
      scale: 1,
      deviceScaleFactor: 1,
      background: 'white',
      timeoutMs: 30_000,
    });

    expect(shot.bytes.length).toBeGreaterThan(1500);
  });
});
