import { randomUUID } from 'node:crypto';
import { unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser, type Page } from 'playwright';
import type { CompiledDesign, Rect } from '../render/DesignCompiler.js';

function htmlUsesFileUrls(html: string): boolean {
  return html.includes('file://');
}

/** Load compiled HTML; `file://` asset refs require a on-disk document (not `about:blank`). */
async function loadCompiledHtml(page: Page, html: string, timeoutMs: number): Promise<string | undefined> {
  if (!htmlUsesFileUrls(html)) {
    await page.setContent(html, { waitUntil: 'load', timeout: timeoutMs });
    return undefined;
  }
  const tempHtmlPath = join(tmpdir(), `hfc-screenshot-${randomUUID()}.html`);
  await writeFile(tempHtmlPath, html, 'utf8');
  await page.goto(pathToFileURL(tempHtmlPath).href, { waitUntil: 'load', timeout: timeoutMs });
  return tempHtmlPath;
}
export interface PlaywrightScreenshotService {
  capture(params: {
    compiled: CompiledDesign;
    clipRect: Rect;
    format: 'png' | 'jpeg';
    scale: number;
    deviceScaleFactor?: number;
    background?: 'white' | 'transparent';
    timeoutMs: number;
  }): Promise<{ bytes: Buffer; width: number; height: number; mimeType: string }>;
}

let browserSingleton: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserSingleton) {
    browserSingleton = await chromium.launch({ headless: true });
  }
  return browserSingleton;
}

/** Close the shared Playwright browser (CLI render and tests). */
export async function closeSharedBrowser(): Promise<void> {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}

/** @deprecated Use closeSharedBrowser */
export const __closeTestBrowser = closeSharedBrowser;

export const playwrightScreenshotService: PlaywrightScreenshotService = {
  async capture(params) {
    const browser = await getBrowser();
    const dpr = params.deviceScaleFactor ?? params.scale;
    const page = await browser.newPage({
      deviceScaleFactor: dpr,
      viewport: {
        width: Math.ceil(params.compiled.viewportWidth),
        height: Math.ceil(params.compiled.viewportHeight),
      },
    });
    let tempHtmlPath: string | undefined;
    try {
      tempHtmlPath = await loadCompiledHtml(page, params.compiled.html, params.timeoutMs);
      const fontsReady = page.evaluate('document.fonts.ready');
      await Promise.race([
        fontsReady,
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`document.fonts.ready timed out after ${params.timeoutMs}ms`)),
            params.timeoutMs,
          );
        }),
      ]);
      if (params.background === 'white') {
        await page.addStyleTag({ content: 'body { background: #fff !important; }' });
      }
      const clip = {
        x: params.clipRect.x,
        y: params.clipRect.y,
        width: params.clipRect.width,
        height: params.clipRect.height,
      };
      const buf = await page.screenshot({
        type: params.format === 'jpeg' ? 'jpeg' : 'png',
        clip,
        omitBackground: params.background === 'transparent',
        animations: 'disabled',
      });
      const mimeType = params.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const pixelW = Math.round(clip.width * dpr);
      const pixelH = Math.round(clip.height * dpr);
      return { bytes: buf, width: pixelW, height: pixelH, mimeType };
    } finally {
      await page.close();
      if (tempHtmlPath) {
        await unlink(tempHtmlPath).catch(() => undefined);
      }
    }
  },
};
