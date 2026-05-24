import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { getLocalFontsFileBaseUrl } from '../../src/fonts/localFontRegistry.js';
import type { FileEnvelope } from '../../src/model/types.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import { buildImageFileUrlForSubtree } from '../../src/render/imageDataUrls.js';
import { playwrightScreenshotService, __closeTestBrowser } from '../../src/screenshot/PlaywrightScreenshotService.js';

const OKER_HFC = join(
  import.meta.dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

describe('screenshot file:// image URLs', () => {
  afterAll(async () => {
    await __closeTestBrowser();
  });

  it('paints disk assets when compiled HTML uses file URLs', async () => {
    const envelope = JSON.parse(readFileSync(OKER_HFC, 'utf8')) as FileEnvelope;
    const rootNodeId = resolveHfcNodeIdBySourceFigmaId(envelope, '1655:195069');
    expect(rootNodeId).toBeTruthy();

    const compiled = designCompiler.compileSubtree({
      envelope,
      rootNodeId: rootNodeId!,
      options: {
        viewportPaddingPx: 8,
        includeCss: true,
        inlineCss: true,
        fontBaseUrl: getLocalFontsFileBaseUrl(),
        imageDataUrlByHash: buildImageFileUrlForSubtree(envelope, OKER_HFC, rootNodeId!),
      },
    });
    expect(compiled.html).toContain('file://');
    expect(compiled.html).not.toContain('data:image/');

    const shot = await playwrightScreenshotService.capture({
      compiled,
      clipRect: compiled.rootClip,
      format: 'png',
      scale: 1,
      deviceScaleFactor: 2,
      background: 'white',
      timeoutMs: 60_000,
    });

    // Without a real document URL, file:// backgrounds stay blank (~280KB). Loaded images are multi-MB.
    expect(shot.bytes.length).toBeGreaterThan(1_000_000);
  });
});
