import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DocumentEngine } from '../../src/engine/DocumentEngine.js';
import { getLocalFontsFileBaseUrl } from '../../src/fonts/localFontRegistry.js';
import type { FileEnvelope } from '../../src/model/types.js';
import { JsonPersistence } from '../../src/persistence/JsonPersistence.js';
import { resolveHfcNodeIdBySourceFigmaId } from '../../src/resolveNodeRef.js';
import { designCompiler } from '../../src/render/DesignCompiler.js';
import type { CompiledDesign, CompileHtmlOptions } from '../../src/render/DesignCompiler.js';
import { createCompileRenderContext } from '../../src/render/compileRenderContext.js';
import { createConsoleLogger } from '../../src/util/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const OKER_DESIGN_PATH = join(
  __dirname,
  '../../../../envs/figma-design/designs/oker-final-design/design.hfc.json'
);

export const OKER_FIGMA_NODE = '1655:195069';

export function getOkerSaleSectionRootId(envelope: FileEnvelope): string {
  const id = resolveHfcNodeIdBySourceFigmaId(envelope, OKER_FIGMA_NODE);
  if (!id) {
    throw new Error(`oker sale section not found for ${OKER_FIGMA_NODE}`);
  }
  return id;
}

export function snapshotKey(compiled: CompiledDesign): string {
  const warnings = [...compiled.warnings].sort();
  return createHash('sha256')
    .update(JSON.stringify({ html: compiled.html, css: compiled.css, warnings }))
    .digest('hex');
}

export function loadOkerEnvelope(): FileEnvelope {
  return JSON.parse(readFileSync(OKER_DESIGN_PATH, 'utf8')) as FileEnvelope;
}

export async function loadOkerEngine(): Promise<{
  engine: DocumentEngine;
  designPath: string;
  cleanup: () => void;
}> {
  const { copyFileSync, mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const base = mkdtempSync(join(tmpdir(), 'hfc-oker-'));
  const designPath = join(base, 'design.hfc.json');
  copyFileSync(OKER_DESIGN_PATH, designPath);
  const engine = new DocumentEngine({
    persistence: new JsonPersistence(),
    logger: createConsoleLogger('error'),
  });
  await engine.loadFromDisk({ absolutePath: designPath, save: false });
  return {
    engine,
    designPath,
    cleanup: () => rmSync(base, { recursive: true, force: true }),
  };
}

const defaultCompileOptions = (): CompileHtmlOptions => ({
  viewportPaddingPx: 0,
  includeCss: true,
  inlineCss: true,
  fontBaseUrl: getLocalFontsFileBaseUrl(),
});

export function compileSaleSection(
  envelope: FileEnvelope,
  rootNodeId: string,
  options?: Partial<CompileHtmlOptions>
): CompiledDesign {
  return designCompiler.compileSubtree({
    envelope,
    rootNodeId,
    options: { ...defaultCompileOptions(), ...options },
  });
}

/** MCP path: overlay compile without envelope clone. */
export function compileSaleSectionWithOverlay(
  envelope: FileEnvelope,
  rootNodeId: string,
  graph?: import('../../src/engine/nodeIndex.js').GraphIndexes,
  options?: Partial<CompileHtmlOptions>
): CompiledDesign {
  return designCompiler.compileSubtree({
    envelope,
    rootNodeId,
    graph,
    renderContext: createCompileRenderContext(),
    options: { ...defaultCompileOptions(), ...options },
  });
}
