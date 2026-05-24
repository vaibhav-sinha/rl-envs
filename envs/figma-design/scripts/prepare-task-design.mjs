#!/usr/bin/env node
/**
 * Materialize per-task design files from a shared design export at Docker build time.
 *
 * Usage:
 *   node prepare-task-design.mjs --spec /environment/design-spec.json
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pruneEnvelopeBySourceFigmaIds } from './prune-hfc.mjs';

const DEFAULTS = {
  spec: '/environment/design-spec.json',
  designsRoot: '/opt/figma-design/designs',
  workspace: '/data/workspace',
  baseline: '/tests/design.initial.hfc.json',
};

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--spec' && argv[i + 1]) opts.spec = argv[++i];
    else if (arg === '--designs-root' && argv[i + 1]) opts.designsRoot = argv[++i];
    else if (arg === '--workspace' && argv[i + 1]) opts.workspace = argv[++i];
    else if (arg === '--baseline' && argv[i + 1]) opts.baseline = argv[++i];
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv);

  const spec = JSON.parse(readFileSync(opts.spec, 'utf8'));
  const base = spec.base;
  if (!base || typeof base !== 'string') {
    throw new Error('design-spec.json: base is required');
  }

  const designDir = join(opts.designsRoot, base);
  const sourceDesign = join(designDir, 'design.hfc.json');
  if (!existsSync(sourceDesign)) {
    throw new Error(`Design export not found: ${sourceDesign}`);
  }

  let envelope = JSON.parse(readFileSync(sourceDesign, 'utf8'));
  const exclusions = spec.node_exclusions ?? [];
  if (exclusions.length > 0) {
    envelope = pruneEnvelopeBySourceFigmaIds(envelope, exclusions);
  }

  mkdirSync(opts.workspace, { recursive: true });
  mkdirSync(dirname(opts.baseline), { recursive: true });

  const designJson = `${JSON.stringify(envelope)}\n`;
  writeFileSync(join(opts.workspace, 'design.hfc.json'), designJson, 'utf8');
  writeFileSync(opts.baseline, designJson, 'utf8');

  const sourceAssets = join(designDir, 'design.hfc.assets');
  const targetAssets = join(opts.workspace, 'design.hfc.assets');
  if (existsSync(sourceAssets)) {
    cpSync(sourceAssets, targetAssets, { recursive: true });
  }

  rmSync(opts.designsRoot, { recursive: true, force: true });
}

main();
