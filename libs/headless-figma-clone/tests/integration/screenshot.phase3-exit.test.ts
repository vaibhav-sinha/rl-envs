import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageDataUrlByHash } from '../../src/render/imageDataUrls.js';
import { playwrightScreenshotService, __closeTestBrowser } from '../../src/screenshot/PlaywrightScreenshotService.js';
import type { FileEnvelope } from '../../src/model/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadShowcase(): { envelope: FileEnvelope; jsonPath: string } {
  const jsonPath = join(__dirname, '../fixtures/phase3-showcase.hfc.json');
  return { envelope: JSON.parse(readFileSync(jsonPath, 'utf8')) as FileEnvelope, jsonPath };
}

describe('Phase 3 exit screenshot', () => {
  afterAll(async () => {
    await __closeTestBrowser();
  });

  it('matches golden PNG for phase3-showcase fixture (root I3)', async () => {
    const { envelope, jsonPath } = loadShowcase();
    const imgMap = buildImageDataUrlByHash(envelope, jsonPath);
    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: 'I3',
      options: { viewportPaddingPx: 0, includeCss: true, inlineCss: true, imageDataUrlByHash: imgMap },
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
    expect(shot.bytes).toMatchFileSnapshot(join(__dirname, '../golden/phase3-exit.png'));
  });
});
