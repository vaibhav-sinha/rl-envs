import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { getLocalFontsFileBaseUrl } from '../fonts/localFontRegistry.js';
import type { FileEnvelope } from '../model/types.js';
import { compileSubtreeForScreenshot } from './compileForScreenshot.js';
import { buildImageFileUrlForSubtree } from './imageDataUrls.js';
import { playwrightScreenshotService } from '../screenshot/PlaywrightScreenshotService.js';

const SCREENSHOT_TIMEOUT_MS = 30_000;

export async function renderNodeToFile(params: {
  envelope: FileEnvelope;
  envelopePath: string;
  nodeId: string;
  outPath: string;
  background?: 'white' | 'transparent';
  scale?: number;
  viewportPaddingPx?: number;
}): Promise<void> {
  await mkdir(dirname(params.outPath), { recursive: true });

  const compiled = await compileSubtreeForScreenshot({
    envelope: params.envelope,
    rootNodeId: params.nodeId,
    options: {
      viewportPaddingPx: params.viewportPaddingPx ?? 0,
      includeCss: true,
      inlineCss: true,
      fontBaseUrl: getLocalFontsFileBaseUrl(),
      imageDataUrlByHash: buildImageFileUrlForSubtree(
        params.envelope,
        params.envelopePath,
        params.nodeId
      ),
    },
    screenshot: playwrightScreenshotService,
    screenshotTimeoutMs: SCREENSHOT_TIMEOUT_MS,
  });

  const shot = await playwrightScreenshotService.capture({
    compiled,
    clipRect: compiled.rootClip,
    format: 'png',
    scale: params.scale ?? 1,
    deviceScaleFactor: 2,
    background: params.background ?? 'white',
    timeoutMs: SCREENSHOT_TIMEOUT_MS,
  });

  await writeFile(params.outPath, shot.bytes);
}
