import type { FileEnvelope } from '../model/types.js';
import type { CompileHtmlOptions, CompiledDesign } from './DesignCompiler.js';
import { designCompiler } from './DesignCompiler.js';
import { rasterizePatternTileDataUrls } from './patternTiles.js';
import type { PlaywrightScreenshotService } from '../screenshot/PlaywrightScreenshotService.js';

/** Compile a subtree and rasterize pattern source nodes for faithful pattern fills. */
export async function compileSubtreeForScreenshot(params: {
  envelope: FileEnvelope;
  rootNodeId: string;
  options: CompileHtmlOptions;
  screenshot: PlaywrightScreenshotService;
  screenshotTimeoutMs: number;
}): Promise<CompiledDesign> {
  const patternTileDataUrlByNodeId = await rasterizePatternTileDataUrls({
    envelope: params.envelope,
    rootNodeId: params.rootNodeId,
    compileOptions: params.options,
    screenshot: params.screenshot,
    timeoutMs: params.screenshotTimeoutMs,
    designCompiler,
  });
  return designCompiler.compileSubtree({
    envelope: params.envelope,
    rootNodeId: params.rootNodeId,
    options: {
      ...params.options,
      patternTileDataUrlByNodeId,
    },
  });
}
