#!/usr/bin/env node
/**
 * Write a task baseline design.hfc.json from design-spec.json + shared export.
 * Applies node_exclusions the same way as prepare-task-design.mjs.
 *
 * Usage:
 *   node materialize-design-from-spec.mjs \
 *     --spec path/to/design-spec.json \
 *     --source path/to/design.hfc.json \
 *     --out path/to/output/design.hfc.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pruneEnvelopeBySourceFigmaIds } from './prune-hfc.mjs';

function parseArgs(argv) {
  const opts = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--spec' && argv[i + 1]) opts.spec = argv[++i];
    else if (arg === '--source' && argv[i + 1]) opts.source = argv[++i];
    else if (arg === '--out' && argv[i + 1]) opts.out = argv[++i];
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv);
  if (!opts.spec || !opts.source || !opts.out) {
    throw new Error('Usage: materialize-design-from-spec.mjs --spec <path> --source <path> --out <path>');
  }

  const spec = JSON.parse(readFileSync(opts.spec, 'utf8'));
  let envelope = JSON.parse(readFileSync(opts.source, 'utf8'));
  const exclusions = spec.node_exclusions ?? [];
  if (exclusions.length > 0) {
    envelope = pruneEnvelopeBySourceFigmaIds(envelope, exclusions);
  }

  writeFileSync(opts.out, `${JSON.stringify(envelope)}\n`, 'utf8');
}

main();
