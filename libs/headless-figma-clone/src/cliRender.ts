import { readFileSync } from 'node:fs';
import { setFontsDir } from './fonts/localFontRegistry.js';
import { getDefaultFontsDir } from './fonts/packageRoot.js';
import type { FileEnvelope } from './model/types.js';
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
  const out = parseFlag(argv, '--out');
  if (!file || !node || !out) {
    // eslint-disable-next-line no-console
    console.error(`Usage:
  hfc render --file <path.hfc.json> --node <id> --out <png>
    [--scale N] [--background white|transparent] [--padding N]
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
    await renderNodeToFile({
      envelope,
      envelopePath: file,
      nodeId: node,
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
