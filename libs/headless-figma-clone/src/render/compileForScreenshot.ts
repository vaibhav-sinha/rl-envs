import type { GraphIndexes } from '../engine/nodeIndex.js';
import type { FileEnvelope } from '../model/types.js';
import type { CompileHtmlOptions, CompiledDesign } from './DesignCompiler.js';
import { createCompileRenderContext } from './compileRenderContext.js';
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
  graph?: GraphIndexes;
  renderContext?: ReturnType<typeof createCompileRenderContext>;
  filePath?: string | null;
}): Promise<CompiledDesign> {
  const renderContext = params.renderContext ?? createCompileRenderContext();
  const patternTileDataUrlByNodeId = await rasterizePatternTileDataUrls({
    envelope: params.envelope,
    rootNodeId: params.rootNodeId,
    compileOptions: params.options,
    screenshot: params.screenshot,
    timeoutMs: params.screenshotTimeoutMs,
    designCompiler,
    graph: params.graph,
    renderContext,
    filePath: params.filePath,
  });
  return designCompiler.compileSubtree({
    envelope: params.envelope,
    rootNodeId: params.rootNodeId,
    graph: params.graph,
    renderContext,
    options: {
      ...params.options,
      patternTileDataUrlByNodeId,
    },
  });
}
