#!/usr/bin/env node
/**
 * Scaffold a new task under envs/figma-design/tasks/<task-id>.
 *
 * Usage:
 *   node envs/figma-design/scripts/new-task.mjs <task-id> --design <export-name> [--eval-spec]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIGMA_MCP_ONLY_PREAMBLE } from '../shared/instruction-preamble.mjs';
import { renderTaskDockerfile } from './dockerfile-template.mjs';
import { EVAL_SPEC_FILE, syncInstructionToEnvironment, syncVerifierToTask } from './sync-verifier.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const datasetRoot = resolve(scriptDir, '..');

const DEFAULT_EVAL_SPEC = {
  schema_version: 1,
  gates: { require_change: true, no_detached_nodes: true },
  checks: [],
};

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage: node scripts/new-task.mjs <task-id> --design <export-name> [--eval-spec]`);
  process.exit(args.length === 0 ? 1 : 0);
}

const taskId = args[0];
let designBase = null;
let withEvalSpec = false;

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--design' && args[i + 1]) {
    designBase = args[++i];
  } else if (args[i] === '--eval-spec') {
    withEvalSpec = true;
  }
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(taskId)) {
  console.error('task-id must be lowercase alphanumeric with hyphens');
  process.exit(1);
}

if (!designBase || !/^[a-z0-9][a-z0-9-]*$/.test(designBase)) {
  console.error('--design <export-name> is required (lowercase alphanumeric with hyphens)');
  process.exit(1);
}

const designExportPath = join(datasetRoot, 'designs', designBase, 'design.hfc.json');
if (!existsSync(designExportPath)) {
  console.error(`Design export not found: ${designExportPath}`);
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

writeFileSync(
  join(envDir, 'design-spec.json'),
  `${JSON.stringify({ schema_version: 1, base: designBase }, null, 2)}\n`,
  'utf8',
);

mkdirSync(join(envDir, 'assets'), { recursive: true });
writeFileSync(join(envDir, 'assets', '.gitkeep'), '', 'utf8');

syncVerifierToTask(taskRoot, join(datasetRoot, 'shared', 'verifier'), { preserveEvalSpec: false });

if (withEvalSpec) {
  writeFileSync(
    join(testsDir, EVAL_SPEC_FILE),
    `${JSON.stringify(DEFAULT_EVAL_SPEC, null, 2)}\n`,
    'utf8',
  );
}

writeFileSync(join(envDir, 'Dockerfile'), renderTaskDockerfile(), 'utf8');

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
timeout_sec = 600.0

[verifier.env]
EVAL_JUDGE_MODEL = "\${EVAL_JUDGE_MODEL:-gemini/gemini-3-flash-preview}"
ANTHROPIC_API_KEY = "\${ANTHROPIC_API_KEY:-}"
OPENAI_API_KEY = "\${OPENAI_API_KEY:-}"
GEMINI_API_KEY = "\${GEMINI_API_KEY:-}"

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
workdir = "/app"

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

[[artifacts]]
source = "/data/workspace/design.hfc.json"
destination = "design.hfc.json"

[[artifacts]]
source = "/data/workspace/issues.hfc.json"
destination = "issues.hfc.json"
`,
  'utf8',
);

writeFileSync(
  join(taskRoot, 'instruction.md'),
  `${FIGMA_MCP_ONLY_PREAMBLE}

# ${taskId}

## Goal

<!-- Describe the design change the agent should make. -->

<!-- Optional: reference files shipped for the agent at /app/assets/ -->
<!-- e.g. Use upload_assets with filePath assets/logo.png (cwd is /app). -->

`,
  'utf8',
);

syncInstructionToEnvironment(taskRoot);

if (process.env.TB_SKIP_HARBOR_ADD !== '1') {
  const harborBin = process.env.TB_HARBOR_BIN?.trim() || 'harbor';
  const manifestPath = join(datasetRoot, 'dataset.toml');
  if (!existsSync(manifestPath)) {
    console.error(`Dataset manifest not found: ${manifestPath}`);
    process.exit(1);
  }
  const result = spawnSync(harborBin, ['add', `tasks/${taskId}`, '--to', manifestPath], {
    cwd: datasetRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) {
    console.error(`harbor add failed: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit code ${result.status ?? 'unknown'}`;
    console.error(`harbor add failed: ${detail}`);
    process.exit(result.status ?? 1);
  }
  const summary = result.stdout?.trim();
  if (summary) {
    console.log(summary);
  }
}

console.log(`Created task: ${taskRoot}`);
console.log(`  design base: ${designBase}`);
if (withEvalSpec) {
  console.log(`  ${EVAL_SPEC_FILE}: starter template`);
}
console.log('\nNext: edit instruction.md and tests/eval-spec.json, rebuild base if needed, then:');
console.log(`  harbor run -p ${taskRoot.replace(/\\/g, '/')} --env docker -a <agent> -m <model>`);
if (process.env.TB_SKIP_HARBOR_ADD === '1') {
  console.log(`\nRun manually: harbor add tasks/${taskId}`);
}
