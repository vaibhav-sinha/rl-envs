import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import type { FileEnvelope } from '../../src/model/types.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { playwrightScreenshotService, __closeTestBrowser } from '../../src/screenshot/PlaywrightScreenshotService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDemo(): { envelope: FileEnvelope; jsonPath: string } {
  const jsonPath = join(__dirname, '../fixtures/phase5-demo.hfc.json');
  return { envelope: JSON.parse(readFileSync(jsonPath, 'utf8')) as FileEnvelope, jsonPath };
}

describe('Phase 5 exit screenshot', () => {
  afterAll(async () => {
    await __closeTestBrowser();
  });

  it('matches golden PNG for phase5 demo fixture (root I3)', async () => {
    const { envelope } = loadDemo();
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
    expect(shot.bytes).toMatchFileSnapshot(join(__dirname, '../golden/phase5-exit.png'));
  });
});
