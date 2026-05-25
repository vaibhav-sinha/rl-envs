#!/usr/bin/env node
/** Regenerate all Barlow *.metrics.json from manifest.json */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFontMetrics } from './generate-font-metrics.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BARLOW_DIR = join(__dirname, '..', 'fonts', 'barlow');

async function main() {
  const manifest = JSON.parse(await readFile(join(BARLOW_DIR, 'manifest.json'), 'utf8'));
  for (const face of manifest.faces) {
    const inputPath = join(BARLOW_DIR, face.file);
    const outputPath = join(BARLOW_DIR, face.metrics);
    await generateFontMetrics(inputPath, outputPath, {
      family: face.family,
      style: face.style,
      weight: face.fontWeight,
    });
    console.log(`Wrote ${face.metrics}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
