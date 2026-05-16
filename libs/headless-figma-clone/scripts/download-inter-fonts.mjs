#!/usr/bin/env node
/**
 * Download Inter upright static woff2 files into fonts/inter/ and write manifest.json.
 * Idempotent — safe to re-run.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const OUT_DIR = join(PACKAGE_ROOT, 'fonts', 'inter');

/** @type {Array<{ figmaStyle: string; fontWeight: number; fileBase: string; fontsourceWeight: number }>} */
const WEIGHTS = [
  { figmaStyle: 'Thin', fontWeight: 100, fileBase: 'Inter-Thin', fontsourceWeight: 100 },
  { figmaStyle: 'Extra Light', fontWeight: 200, fileBase: 'Inter-ExtraLight', fontsourceWeight: 200 },
  { figmaStyle: 'Light', fontWeight: 300, fileBase: 'Inter-Light', fontsourceWeight: 300 },
  { figmaStyle: 'Regular', fontWeight: 400, fileBase: 'Inter-Regular', fontsourceWeight: 400 },
  { figmaStyle: 'Medium', fontWeight: 500, fileBase: 'Inter-Medium', fontsourceWeight: 500 },
  { figmaStyle: 'Semi Bold', fontWeight: 600, fileBase: 'Inter-SemiBold', fontsourceWeight: 600 },
  { figmaStyle: 'Bold', fontWeight: 700, fileBase: 'Inter-Bold', fontsourceWeight: 700 },
  { figmaStyle: 'Extra Bold', fontWeight: 800, fileBase: 'Inter-ExtraBold', fontsourceWeight: 800 },
  { figmaStyle: 'Black', fontWeight: 900, fileBase: 'Inter-Black', fontsourceWeight: 900 },
];

function fontsourceUrl(weight) {
  return `https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-${weight}-normal.woff2`;
}

async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return buf.length;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const manifest = {
    version: 1,
    family: 'Inter',
    defaultStyle: 'Regular',
    faces: [],
  };

  for (const w of WEIGHTS) {
    const fileName = `${w.fileBase}.woff2`;
    const filePath = join(OUT_DIR, fileName);
    const url = fontsourceUrl(w.fontsourceWeight);
    const bytes = await download(url, filePath);
    const metricsFile = `${w.fileBase}.metrics.json`;
    manifest.faces.push({
      family: 'Inter',
      style: w.figmaStyle,
      fontWeight: w.fontWeight,
      italic: false,
      file: fileName,
      metrics: metricsFile,
    });
    console.log(`Wrote ${fileName} (${bytes} bytes)`);
  }

  await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('Wrote manifest.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
