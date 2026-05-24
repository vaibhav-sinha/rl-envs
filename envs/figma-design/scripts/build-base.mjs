#!/usr/bin/env node
/**
 * Build the shared Figma design Harbor base image (HFC + Playwright + entrypoint).
 * Run from anywhere; resolves repository root automatically.
 *
 *   node envs/figma-design/scripts/build-base.mjs
 *   node envs/figma-design/scripts/build-base.mjs --with-cursor-cli
 *   node envs/figma-design/scripts/build-base.mjs --hfc-prebuilt
 *
 * When the bundle has prebuilt HFC (no src/, dist/ present), prebuilt mode is
 * auto-detected. Override with --hfc-prebuilt / --no-hfc-prebuilt or
 * FIGMA_DESIGN_HFC_PREBUILT=1|0.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const datasetRoot = resolve(scriptDir, '..');
const repoRoot = resolve(datasetRoot, '..', '..');
const hfcRoot = join(repoRoot, 'libs', 'headless-figma-clone');

const argv = process.argv.slice(2);

const withCursorCli =
  argv.includes('--with-cursor-cli') || process.env.FIGMA_DESIGN_INSTALL_CURSOR_CLI === '1';

function resolveHfcPrebuilt() {
  if (argv.includes('--hfc-prebuilt')) return true;
  if (argv.includes('--no-hfc-prebuilt')) return false;
  if (process.env.FIGMA_DESIGN_HFC_PREBUILT === '1') return true;
  if (process.env.FIGMA_DESIGN_HFC_PREBUILT === '0') return false;

  const hasSrc = existsSync(join(hfcRoot, 'src'));
  const hasDist = existsSync(join(hfcRoot, 'dist', 'cli.js'));
  return !hasSrc && hasDist;
}

const hfcPrebuilt = resolveHfcPrebuilt();

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
  '--build-arg',
  `HFC_PREBUILT=${hfcPrebuilt ? 'true' : 'false'}`,
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
if (hfcPrebuilt) {
  console.log('Using prebuilt HFC (skipping npm run build in Docker).');
} else {
  console.log('Building HFC from source inside Docker.');
}

const result = spawnSync('docker', args, {
  stdio: 'inherit',
  cwd: repoRoot,
  env: { ...process.env, DOCKER_BUILDKIT: '1' },
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`\nBuilt ${tag}`);
