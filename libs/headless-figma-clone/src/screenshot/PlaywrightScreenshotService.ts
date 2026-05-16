import { chromium, type Browser } from 'playwright';
import type { CompiledDesign, Rect } from '../render/DesignCompiler.js';
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

/** Visible test hook to close shared browser */
export async function __closeTestBrowser(): Promise<void> {
  if (browserSingleton) {
    await browserSingleton.close();
    browserSingleton = null;
  }
}

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
    try {
      await page.setContent(params.compiled.html, {
        waitUntil: 'load',
        timeout: params.timeoutMs,
      });
      await page.evaluate('document.fonts.ready');
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
    }
  },
};
