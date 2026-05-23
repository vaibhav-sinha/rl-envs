#!/usr/bin/env node
/**
 * Rewrite a .hfc.json file without pretty-printing (compact single-line chunks).
 *
 * Usage: node envs/figma-design/scripts/compact-hfc-json.mjs <path-to.hfc.json>
 */
import { readFileSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeJsonFile } from '../../../libs/figma-task-builder/dist/write-json-stream.js';

const inputPath = resolve(process.argv[2] ?? '');
if (!inputPath.endsWith('.hfc.json')) {
  console.error('Expected a path ending in .hfc.json');
  process.exit(1);
}

const before = statSync(inputPath).size;
const tmpPath = `${inputPath}.compact.tmp`;
console.error(`Reading ${inputPath} (${(before / 1e6).toFixed(1)} MB)…`);
const envelope = JSON.parse(readFileSync(inputPath, 'utf8'));
console.error('Writing compact JSON…');
writeJsonFile(tmpPath, envelope);
renameSync(tmpPath, inputPath);
const after = statSync(inputPath).size;
const pct = ((1 - after / before) * 100).toFixed(1);
console.log(`Compacted ${inputPath}: ${before} → ${after} bytes (${pct}% smaller)`);
