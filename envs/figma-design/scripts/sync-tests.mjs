#!/usr/bin/env node
/**
 * Sync shared/verifier into every task under tasks/.
 * Removes all existing tests/ content except eval-spec.json, then recopies shared verifier files.
 *
 * Usage:
 *   node envs/figma-design/scripts/sync-tests.mjs
 *   node envs/figma-design/scripts/sync-tests.mjs hello-frame with-metadata
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { syncVerifierToTask } from './sync-verifier.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const datasetRoot = resolve(scriptDir, '..');
const tasksRoot = join(datasetRoot, 'tasks');
const sharedVerifier = join(datasetRoot, 'shared', 'verifier');

const args = process.argv.slice(2);
if (args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage: node scripts/sync-tests.mjs [task-id ...]`);
  console.log('  With no args, syncs all directories under tasks/.');
  process.exit(0);
}

if (!existsSync(sharedVerifier)) {
  console.error(`Missing shared verifier: ${sharedVerifier}`);
  process.exit(1);
}

function listTaskIds() {
  if (args.length > 0) {
    return args;
  }
  if (!existsSync(tasksRoot)) {
    return [];
  }
  return readdirSync(tasksRoot).filter((name) => {
    const path = join(tasksRoot, name);
    return statSync(path).isDirectory();
  });
}

const taskIds = listTaskIds();
if (taskIds.length === 0) {
  console.error('No tasks found to sync.');
  process.exit(1);
}

let synced = 0;
for (const taskId of taskIds) {
  const taskRoot = join(tasksRoot, taskId);
  if (!existsSync(taskRoot) || !statSync(taskRoot).isDirectory()) {
    console.warn(`Skip ${taskId}: not a directory under tasks/`);
    continue;
  }
  syncVerifierToTask(taskRoot, sharedVerifier, { preserveEvalSpec: true });
  console.log(`Synced tests → tasks/${taskId}/tests`);
  synced += 1;
}

console.log(`\nDone. Updated ${synced} task(s).`);
if (synced > 0) {
  console.log('Run `harbor sync` in envs/figma-design if dataset.toml digests should be refreshed.');
}
