#!/usr/bin/env node
/**
 * Scaffold a new task under envs/figma-design/tasks/<task-id>.
 *
 * Usage:
 *   node envs/figma-design/scripts/new-task.mjs <task-id> [--fixture <path-to.hfc.json>] [--with-metadata]
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderTaskDockerfile, sidecarDirForFixture } from './dockerfile-template.mjs';
import { syncVerifierToTask } from './sync-verifier.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const datasetRoot = resolve(scriptDir, '..');
const repoRoot = resolve(datasetRoot, '..', '..');
const sharedVerifier = join(datasetRoot, 'shared', 'verifier');
const defaultFixture = join(
  repoRoot,
  'libs',
  'headless-figma-clone',
  'tests',
  'fixtures',
  'phase2-compile-harness.hfc.json',
);

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage: node scripts/new-task.mjs <task-id> [--fixture <path>] [--with-metadata]`);
  process.exit(args.length === 0 ? 1 : 0);
}

const taskId = args[0];
let fixturePath = defaultFixture;
let withMetadata = false;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--fixture' && args[i + 1]) {
    fixturePath = resolve(args[++i]);
  } else if (args[i] === '--with-metadata') {
    withMetadata = true;
  }
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(taskId)) {
  console.error('task-id must be lowercase alphanumeric with hyphens');
  process.exit(1);
}

const taskRoot = join(datasetRoot, 'tasks', taskId);
if (existsSync(taskRoot)) {
  console.error(`Task already exists: ${taskRoot}`);
  process.exit(1);
}

const envDir = join(taskRoot, 'environment');
const testsDir = join(taskRoot, 'tests');
mkdirSync(envDir, { recursive: true });

cpSync(fixturePath, join(envDir, 'design.hfc.json'));

const sidecarPath = sidecarDirForFixture(fixturePath);
const hasSidecar = sidecarPath !== null && existsSync(sidecarPath);
if (hasSidecar) {
  cpSync(sidecarPath, join(envDir, 'design.hfc.assets'), { recursive: true });
}

mkdirSync(join(envDir, 'assets'), { recursive: true });
writeFileSync(join(envDir, 'assets', '.gitkeep'), '', 'utf8');

syncVerifierToTask(taskRoot, sharedVerifier, { preserveMetadata: false });

if (withMetadata) {
  writeFileSync(
    join(testsDir, 'design-metadata.json'),
    `${JSON.stringify({ expected_node_name: 'Board', notes: 'stub metadata for verifier' }, null, 2)}\n`,
    'utf8',
  );
}

writeFileSync(join(envDir, 'Dockerfile'), renderTaskDockerfile({ hasSidecar }), 'utf8');

writeFileSync(
  join(taskRoot, 'task.toml'),
  `schema_version = "1.2"

[task]
name = "metaphi/figma-design-${taskId}"
description = "Figma design task: ${taskId}"
keywords = ["figma", "mcp", "rewardkit", "design", "headless-figma-clone"]

[metadata]
difficulty = "easy"
category = "design"

[verifier]
timeout_sec = 300.0

[agent]
timeout_sec = 600.0

[environment]
build_timeout_sec = 120.0
os = "linux"
cpus = 2
memory_mb = 4096
storage_mb = 10240
allow_internet = true
skills_dir = "/skills"

[[environment.mcp_servers]]
name = "Figma"
transport = "streamable-http"
url = "http://127.0.0.1:3847/mcp"

[environment.healthcheck]
command = "curl -sf http://127.0.0.1:3847/health"
interval_sec = 2.0
timeout_sec = 5.0
retries = 15
start_period_sec = 15.0
`,
  'utf8',
);

writeFileSync(
  join(taskRoot, 'instruction.md'),
  `# ${taskId}

A design file is already open in **Figma**. Interact with it using the **Figma** MCP server.

## Goal

<!-- Describe the design change the agent should make. -->

<!-- Optional: reference files shipped for the agent at /app/assets/ -->
<!-- e.g. Use upload_assets with filePath assets/logo.png (cwd is /app). -->

`,
  'utf8',
);

console.log(`Created task: ${taskRoot}`);
console.log(`  fixture: ${basename(fixturePath)}`);
if (hasSidecar) {
  console.log('  design.hfc.assets: yes');
}
if (withMetadata) {
  console.log('  design-metadata.json: yes');
}
console.log('\nNext: edit instruction.md, rebuild base if needed, then:');
console.log(`  harbor run -p ${taskRoot.replace(/\\/g, '/')} --env docker -a <agent> -m <model>`);
