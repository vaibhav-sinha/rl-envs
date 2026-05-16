#!/usr/bin/env node
/**
 * Generate per-glyph advance metrics JSON from a font file (woff2/ttf/otf).
 *
 * Usage:
 *   node scripts/generate-font-metrics.mjs <font-file> -o <output.json> [--family Inter] [--style Regular] [--weight 400]
 */
import { writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fontkit = require('fontkit');

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Printable ASCII + common Latin-1 UI letters. */
function charsToMeasure() {
  const out = [];
  for (let cp = 32; cp <= 126; cp++) out.push(String.fromCharCode(cp));
  const extra = '«»€£¥©®°±×÷’“”–—…';
  for (const ch of extra) {
    if (!out.includes(ch)) out.push(ch);
  }
  return out;
}

function parseArgs(argv) {
  const args = { input: null, output: null, family: null, style: null, weight: null };
  const rest = [...argv];
  while (rest.length) {
    const a = rest.shift();
    if (a === '-o' || a === '--output') {
      args.output = rest.shift() ?? null;
    } else if (a === '--family') {
      args.family = rest.shift() ?? null;
    } else if (a === '--style') {
      args.style = rest.shift() ?? null;
    } else if (a === '--weight') {
      const w = Number(rest.shift());
      args.weight = Number.isFinite(w) ? w : null;
    } else if (!a.startsWith('-') && !args.input) {
      args.input = a;
    }
  }
  return args;
}

function inferFromFileName(filePath) {
  const base = basename(filePath).replace(/\.(woff2?|ttf|otf)$/i, '');
  const m = base.match(/^Inter-(.+)$/i);
  if (!m) return { family: 'Inter', style: 'Regular', weight: 400 };
  const slug = m[1];
  const map = {
    Thin: { style: 'Thin', weight: 100 },
    ExtraLight: { style: 'Extra Light', weight: 200 },
    Light: { style: 'Light', weight: 300 },
    Regular: { style: 'Regular', weight: 400 },
    Medium: { style: 'Medium', weight: 500 },
    SemiBold: { style: 'Semi Bold', weight: 600 },
    Bold: { style: 'Bold', weight: 700 },
    ExtraBold: { style: 'Extra Bold', weight: 800 },
    Black: { style: 'Black', weight: 900 },
  };
  const hit = map[slug] ?? { style: 'Regular', weight: 400 };
  return { family: 'Inter', style: hit.style, weight: hit.weight };
}

export async function generateFontMetrics(inputPath, outputPath, overrides = {}) {
  const font = fontkit.openSync(inputPath);

  const inferred = inferFromFileName(inputPath);
  const family = overrides.family ?? font.familyName ?? inferred.family;
  const style = overrides.style ?? font.subfamilyName ?? inferred.style;
  const fontWeight = overrides.weight ?? font.weightClass ?? inferred.weight;

  const unitsPerEm = font.unitsPerEm;
  const ascender = font.ascent;
  const descender = font.descent;
  const lineGap = font.lineGap ?? 0;
  const autoLineHeightEm = (ascender - descender + lineGap) / unitsPerEm;

  const advancesEm = {};
  let sum = 0;
  let count = 0;
  for (const ch of charsToMeasure()) {
    const g = font.glyphForCodePoint(ch.codePointAt(0) ?? 0);
    const adv = g.advanceWidth ?? 0;
    const em = adv / unitsPerEm;
    advancesEm[ch] = Math.round(em * 10000) / 10000;
    sum += em;
    count += 1;
  }
  const avgAdvanceEm = count > 0 ? Math.round((sum / count) * 10000) / 10000 : 0.5;

  const metrics = {
    version: 1,
    family,
    style,
    fontWeight,
    unitsPerEm,
    ascender,
    descender,
    lineGap,
    autoLineHeightEm: Math.round(autoLineHeightEm * 10000) / 10000,
    avgAdvanceEm,
    advancesEm,
  };

  await writeFile(outputPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  return metrics;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output) {
    console.error(
      'Usage: node scripts/generate-font-metrics.mjs <font-file> -o <output.json> [--family NAME] [--style NAME] [--weight N]'
    );
    process.exit(1);
  }
  const inputPath = resolve(args.input);
  const outputPath = resolve(args.output);
  const metrics = await generateFontMetrics(inputPath, outputPath, {
    family: args.family,
    style: args.style,
    weight: args.weight,
  });
  console.log(`Wrote ${outputPath} (${Object.keys(metrics.advancesEm).length} glyphs, avgAdvanceEm=${metrics.avgAdvanceEm})`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
