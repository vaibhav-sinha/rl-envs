#!/usr/bin/env node
/**
 * Build the shared Figma design Harbor base image (HFC + Playwright + entrypoint).
 * Run from anywhere; resolves repository root automatically.
 *
 *   node envs/figma-design/scripts/build-base.mjs
 *   node envs/figma-design/scripts/build-base.mjs --with-cursor-cli
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const datasetRoot = resolve(scriptDir, '..');
const repoRoot = resolve(datasetRoot, '..', '..');

const withCursorCli =
  process.argv.includes('--with-cursor-cli') ||
  process.env.FIGMA_DESIGN_INSTALL_CURSOR_CLI === '1';

const dockerfile = join(datasetRoot, 'shared', 'environment', 'Dockerfile.base');
const tag = process.env.FIGMA_DESIGN_BASE_IMAGE ?? 'metaphi/figma-design-base:latest';

const args = [
  'build',
  '-f',
  dockerfile,
  '-t',
  tag,
  '--build-arg',
  `INSTALL_CURSOR_CLI=${withCursorCli ? 'true' : 'false'}`,
  repoRoot,
];

console.log(`docker ${args.join(' ')}`);
if (withCursorCli) {
  console.log('Including cursor-agent in the base image.');
} else {
  console.log(
    'cursor-agent not included. Pass --with-cursor-cli to pre-install for faster Cursor CLI runs.',
  );
}

const result = spawnSync('docker', args, { stdio: 'inherit', cwd: repoRoot });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`\nBuilt ${tag}`);
