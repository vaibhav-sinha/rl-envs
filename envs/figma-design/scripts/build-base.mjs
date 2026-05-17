#!/usr/bin/env node
/**
 * Build the shared Figma design Harbor base image (HFC + Playwright + entrypoint).
 * Run from anywhere; resolves repository root automatically.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const datasetRoot = resolve(scriptDir, '..');
const repoRoot = resolve(datasetRoot, '..', '..');

const dockerfile = join(datasetRoot, 'shared', 'environment', 'Dockerfile.base');
const tag = process.env.FIGMA_DESIGN_BASE_IMAGE ?? 'metaphi/figma-design-base:latest';

const args = [
  'build',
  '-f',
  dockerfile,
  '-t',
  tag,
  repoRoot,
];

console.log(`docker ${args.join(' ')}`);

const result = spawnSync('docker', args, { stdio: 'inherit', cwd: repoRoot });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`\nBuilt ${tag}`);
