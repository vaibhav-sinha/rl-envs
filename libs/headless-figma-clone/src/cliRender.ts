import { readFileSync, writeFileSync } from 'node:fs';
import { getLocalFontsFileBaseUrl, setFontsDir } from './fonts/localFontRegistry.js';
import { getDefaultFontsDir } from './fonts/packageRoot.js';
import type { FileEnvelope } from './model/types.js';
import { resolveHfcNodeIdBySourceFigmaId } from './resolveNodeRef.js';
import { designCompiler } from './render/DesignCompiler.js';
import { buildImageDataUrlByHash } from './render/imageDataUrls.js';
import { renderNodeToFile } from './render/renderNodeToFile.js';
import { closeSharedBrowser } from './screenshot/PlaywrightScreenshotService.js';

function parseFlag(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return undefined;
}

function loadEnvelopeFromPath(path: string): FileEnvelope {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as FileEnvelope;
  if (!parsed?.document) {
    throw new Error(`Invalid envelope at ${path}: missing document`);
  }
  return parsed;
}

export async function handleRenderCli(argv: string[]): Promise<void> {
  const file = parseFlag(argv, '--file');
  const node = parseFlag(argv, '--node');
  const figmaNode = parseFlag(argv, '--figma-node');
  const out = parseFlag(argv, '--out');
  const dumpHtml = parseFlag(argv, '--dump-html');
  if (!file || !out || (!node && !figmaNode) || (node && figmaNode)) {
    // eslint-disable-next-line no-console
    console.error(`Usage:
  hfc render --file <path.hfc.json> (--node <hfc-id> | --figma-node <sourceFigmaId>) --out <png>
    [--scale N] [--background white|transparent] [--padding N] [--dump-html <path.html>]
`);
    process.exit(1);
  }

  const scale = Number.parseFloat(parseFlag(argv, '--scale') ?? '1');
  const padding = Number.parseInt(parseFlag(argv, '--padding') ?? '0', 10);
  const bgRaw = parseFlag(argv, '--background') ?? 'white';
  if (bgRaw !== 'white' && bgRaw !== 'transparent') {
    throw new Error('--background must be white or transparent');
  }

  setFontsDir(getDefaultFontsDir());

  try {
    const envelope = loadEnvelopeFromPath(file);
    let nodeId = node;
    if (figmaNode) {
      nodeId = resolveHfcNodeIdBySourceFigmaId(envelope, figmaNode) ?? undefined;
      if (!nodeId) {
        // eslint-disable-next-line no-console
        console.error(
          `No node with sourceFigmaId "${figmaNode}" in ${file}`
        );
        process.exit(1);
      }
    }
    if (dumpHtml) {
      const compiled = designCompiler.compileSubtree({
        envelope,
        rootNodeId: nodeId!,
        options: {
          viewportPaddingPx: Number.isFinite(padding) ? padding : 0,
          includeCss: true,
          inlineCss: true,
          fontBaseUrl: getLocalFontsFileBaseUrl(),
          imageDataUrlByHash: buildImageDataUrlByHash(envelope, file),
        },
      });
      writeFileSync(dumpHtml, compiled.html, 'utf8');
      if (compiled.warnings.length) {
        // eslint-disable-next-line no-console
        console.error(compiled.warnings.join('\n'));
      }
    }

    await renderNodeToFile({
      envelope,
      envelopePath: file,
      nodeId: nodeId!,
      outPath: out,
      scale: Number.isFinite(scale) ? scale : 1,
      background: bgRaw,
      viewportPaddingPx: Number.isFinite(padding) ? padding : 0,
    });
  } finally {
    // Release Playwright so the CLI process can exit (singleton otherwise keeps the event loop alive).
    await closeSharedBrowser();
  }
}
