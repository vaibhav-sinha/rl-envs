import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { playwrightScreenshotService, __closeTestBrowser } from '../../src/screenshot/PlaywrightScreenshotService.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadExitFixture(): FileEnvelope {
  const p = join(__dirname, '../fixtures/phase2-exit.json');
  return JSON.parse(readFileSync(p, 'utf8')) as FileEnvelope;
}

describe('Phase 2 exit screenshot', () => {
  afterAll(async () => {
    await __closeTestBrowser();
  });

  it('matches golden PNG for phase2-exit fixture (root I3)', async () => {
    const envelope = loadExitFixture();
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true },
    });
    const shot = await playwrightScreenshotService.capture({
      compiled,
      clipRect: compiled.rootClip,
      format: 'png',
      scale: 1,
      deviceScaleFactor: 1,
      background: 'white',
      timeoutMs: 30_000,
    });
    expect(shot.width).toBe(Math.round(compiled.rootClip.width));
    expect(shot.height).toBe(Math.round(compiled.rootClip.height));
    expect(shot.bytes.length).toBeGreaterThan(1000);
    expect(shot.bytes).toMatchFileSnapshot('../golden/phase2-exit.png');
  });
});
