/**
 * Benchmark readonly MCP tools on oker sale section (Figma 1655:195069).
 * Prints timing.durationMs for get_design_context and get_screenshot (3 runs, median).
 *
 * Usage: npm run build && node scripts/bench-readonly-tools.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DocumentEngine } from '../dist/engine/DocumentEngine.js';
import { getLocalFontsFileBaseUrl } from '../dist/fonts/localFontRegistry.js';
import { buildImageDataUrlForSubtree, buildImageFileUrlForSubtree } from '../dist/render/imageDataUrls.js';
import { resetMcpToolQueueForTests } from '../dist/mcp/mcpToolQueue.js';
import { runMcpToolWithCancellation } from '../dist/mcp/runMcpToolWithCancellation.js';
import { toolJson } from '../dist/mcp/useFigmaMap.js';
import { JsonPersistence } from '../dist/persistence/JsonPersistence.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../dist/resolveNodeRef.js';
import { compileSubtreeForScreenshot } from '../dist/render/compileForScreenshot.js';
import { createCompileRenderContext } from '../dist/render/compileRenderContext.js';
import { designCompiler } from '../dist/render/DesignCompiler.js';
import { playwrightScreenshotService } from '../dist/screenshot/playwrightScreenshotService.js';
import { createConsoleLogger } from '../dist/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OKER_PATH = join(
  __dirname,
  '../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);
const FIGMA_NODE = '1655:195069';
const RUNS = 3;
const SCREENSHOT_TIMEOUT_MS = 30_000;

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function parseTiming(text) {
  const body = JSON.parse(text);
  return body.timing?.durationMs ?? null;
}

async function loadEngine() {
  const engine = new DocumentEngine({
    persistence: new JsonPersistence(),
    logger: createConsoleLogger('error'),
  });
  await engine.loadFromDisk({ absolutePath: OKER_PATH, save: false });
  return engine;
}

async function benchDesignContext(engine, nodeId) {
  const durations = [];
  for (let i = 0; i < RUNS; i++) {
    const result = await runMcpToolWithCancellation(async () => {
      const file = engine.getActiveFile();
      const fp = engine.getActiveFilePath();
      const compiled = designCompiler.compileSubtree({
        envelope: file,
        rootNodeId: nodeId,
        graph: engine.getGraphIndexes(),
        renderContext: createCompileRenderContext(),
        options: {
          viewportPaddingPx: 0,
          includeCss: true,
          inlineCss: true,
          imageDataUrlByHash: fp !== null ? buildImageDataUrlForSubtree(file, fp, nodeId) : {},
        },
      });
      return {
        content: [{ type: 'text', text: toolJson({ html: compiled.html, css: compiled.css }) }],
      };
    });
    const ms = parseTiming(result.content[0].text);
    if (ms !== null) durations.push(ms);
  }
  return median(durations);
}

async function benchScreenshot(engine, nodeId) {
  const durations = [];
  for (let i = 0; i < RUNS; i++) {
    const result = await runMcpToolWithCancellation(async () => {
      const file = engine.getActiveFile();
      const fp = engine.getActiveFilePath();
      const compiled = await compileSubtreeForScreenshot({
        envelope: file,
        rootNodeId: nodeId,
        graph: engine.getGraphIndexes(),
        renderContext: createCompileRenderContext(),
        filePath: fp,
        options: {
          viewportPaddingPx: 0,
          includeCss: true,
          inlineCss: true,
          fontBaseUrl: getLocalFontsFileBaseUrl(),
          imageDataUrlByHash: fp !== null ? buildImageFileUrlForSubtree(file, fp, nodeId) : {},
        },
        screenshot: playwrightScreenshotService,
        screenshotTimeoutMs: SCREENSHOT_TIMEOUT_MS,
      });
      await playwrightScreenshotService.capture({
        compiled,
        clipRect: compiled.rootClip,
        format: 'png',
        scale: 1,
        deviceScaleFactor: 1,
        background: 'white',
        timeoutMs: SCREENSHOT_TIMEOUT_MS,
      });
      return { content: [{ type: 'text', text: toolJson({ ok: true }) }] };
    });
    const ms = parseTiming(result.content[0].text);
    if (ms !== null) durations.push(ms);
  }
  return median(durations);
}

async function main() {
  resetMcpToolQueueForTests();
  const envelope = JSON.parse(readFileSync(OKER_PATH, 'utf8'));
  const nodeId = resolveHfcNodeIdBySourceFigmaId(envelope, FIGMA_NODE);
  if (!nodeId) {
    console.error(`Node ${FIGMA_NODE} not found`);
    process.exit(1);
  }

  const engine = await loadEngine();
  console.log(`fixture: ${OKER_PATH}`);
  console.log(`node: ${FIGMA_NODE} -> ${nodeId}`);
  console.log(`runs: ${RUNS} (median durationMs)`);

  const designMs = await benchDesignContext(engine, nodeId);
  console.log(`get_design_context.durationMs (median): ${designMs}`);

  const shotMs = await benchScreenshot(engine, nodeId);
  console.log(`get_screenshot.durationMs (median): ${shotMs}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
