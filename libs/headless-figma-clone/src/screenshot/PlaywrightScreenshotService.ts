import { chromium, type Browser, type Page } from 'playwright';
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
  /**
   * Load compiled HTML and measure single-line width per text node (`data-hfc-id` → px).
   * Uses an off-screen nowrap probe so widths are not clipped by heuristic layout boxes.
   */
  measureTextWidthsFromCompiledHtml(params: { html: string; timeoutMs: number }): Promise<Record<string, number>>;
}

let browserSingleton: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserSingleton) {
    browserSingleton = await chromium.launch({ headless: true });
  }
  return browserSingleton;
}

/**
 * Load catalog webfonts (matches {@link ../fonts/fontCatalog} BUNDLED_FONTS) and wait until the
 * Font Loading API reports they are usable — otherwise Chromium measures with fallback metrics.
 */
async function waitForCatalogWebFonts(page: Page, timeoutMs: number): Promise<void> {
  const budget = Math.min(15_000, Math.max(2_000, timeoutMs));
  await page.evaluate(`(() => {
    return (async () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;700&display=block';
      document.head.appendChild(link);
      const budgetArg = ${String(budget)};
      await new Promise((resolve) => {
        link.onload = () => resolve(undefined);
        link.onerror = () => resolve(undefined);
        setTimeout(() => resolve(undefined), budgetArg);
      });
      await document.fonts.ready;
      const deadline = Date.now() + budgetArg;
      while (Date.now() < deadline) {
        if (document.fonts.check('16px Inter')) break;
        await new Promise((r) => setTimeout(r, 50));
      }
    })();
  })()`);
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
      await waitForCatalogWebFonts(page, params.timeoutMs);
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

  async measureTextWidthsFromCompiledHtml(params) {
    const browser = await getBrowser();
    const page = await browser.newPage({
      viewport: { width: 2400, height: 1200 },
    });
    try {
      await page.setContent(params.html, {
        waitUntil: 'load',
        timeout: params.timeoutMs,
      });
      await waitForCatalogWebFonts(page, params.timeoutMs);
      return await page.evaluate<Record<string, number>>(`(() => {
  const out = {};
  const root = document.getElementById('hfc-root');
  if (!root) return out;
  for (const node of root.querySelectorAll('[data-hfc-id]')) {
    const id = node.getAttribute('data-hfc-id');
    if (!id) continue;
    const inner = node.querySelector(':scope > .hfc-text-inner');
    if (!inner) continue;
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;left:-99999px;top:0;visibility:hidden;white-space:nowrap;max-width:none;width:auto;height:auto;overflow:visible;display:inline-block;';
    probe.appendChild(inner.cloneNode(true));
    document.body.appendChild(probe);
    const w = probe.scrollWidth;
    document.body.removeChild(probe);
    if (w > 0) out[id] = Math.ceil(w);
  }
  return out;
})()`);
    } finally {
      await page.close();
    }
  },
};
