import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { TaskBuilderConfig } from './config.js';
import type { BuilderState } from './types.js';
import { assertUniqueCheckIds, validateEvalSpec } from './eval-spec-validator.js';

const TASK_TEST_FILES = ['check.py', 'test.sh'] as const;
const EVAL_SPEC_FILE = 'eval-spec.json';

function sidecarDirForHfcJson(hfcPath: string): string {
  if (!hfcPath.endsWith('.hfc.json')) return '';
  return hfcPath.slice(0, -'.hfc.json'.length) + '.hfc.assets';
}

function renderTaskDockerfile(hasSidecar: boolean): string {
  const lines = [
    'FROM metaphi/figma-design-base:latest',
    '',
    'COPY design.hfc.json /data/workspace/design.hfc.json',
    'COPY design.hfc.json /tests/design.initial.hfc.json',
    'COPY instruction.md /tests/instruction.md',
    'ENV HFC_INITIAL_FILE=/data/workspace/design.hfc.json',
    '',
    'COPY assets/ /app/assets/',
  ];
  if (hasSidecar) {
    lines.push('', 'COPY design.hfc.assets/ /data/workspace/design.hfc.assets/');
  }
  lines.push('');
  return lines.join('\n');
}

function renderTaskToml(taskId: string, meta: BuilderState['metadata']): string {
  return `schema_version = "1.2"

[task]
name = "metaphi/figma-design-${taskId}"
description = "${meta.description.replace(/"/g, '\\"')}"
keywords = ["figma", "mcp", "rewardkit", "design", "headless-figma-clone"]

[metadata]
difficulty = "${meta.difficulty}"
category = "${meta.category}"

[verifier]
timeout_sec = ${meta.verifier_timeout_sec}.0

[agent]
timeout_sec = ${meta.agent_timeout_sec}.0

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
`;
}

export function finalizeTask(config: TaskBuilderConfig, taskId: string): void {
  const draftRoot = join(config.tasksDir, taskId);
  const harborRoot = join(config.harborTasksDir, taskId);

  if (!existsSync(draftRoot)) {
    throw new Error(`Draft not found: ${taskId}`);
  }
  if (existsSync(harborRoot)) {
    throw new Error(`Harbor task already exists: ${taskId}`);
  }

  const designPath = join(draftRoot, 'environment', 'design.hfc.json');
  if (!existsSync(designPath)) {
    throw new Error('Export required: environment/design.hfc.json missing');
  }

  const instructionPath = join(draftRoot, 'instruction.md');
  if (!existsSync(instructionPath)) {
    throw new Error('instruction.md missing');
  }

  const evalSpecPath = join(draftRoot, 'tests', EVAL_SPEC_FILE);
  if (!existsSync(evalSpecPath)) {
    throw new Error(`${EVAL_SPEC_FILE} missing`);
  }
  const evalSpec = JSON.parse(readFileSync(evalSpecPath, 'utf8')) as unknown;
  validateEvalSpec(config.evalSpecSchemaPath, evalSpec);
  assertUniqueCheckIds(evalSpec as import('./types.js').EvalSpec);

  const sidecar = sidecarDirForHfcJson(designPath);
  const hasSidecar = sidecar !== '' && existsSync(join(draftRoot, 'environment', basename(sidecar)));

  mkdirSync(harborRoot, { recursive: true });
  mkdirSync(join(harborRoot, 'environment'), { recursive: true });
  mkdirSync(join(harborRoot, 'tests'), { recursive: true });

  cpSync(join(draftRoot, 'environment'), join(harborRoot, 'environment'), { recursive: true });
  cpSync(instructionPath, join(harborRoot, 'instruction.md'));

  for (const name of TASK_TEST_FILES) {
    cpSync(join(config.sharedVerifierDir, name), join(harborRoot, 'tests', name));
  }
  cpSync(evalSpecPath, join(harborRoot, 'tests', EVAL_SPEC_FILE));

  const state = JSON.parse(
    readFileSync(join(draftRoot, 'builder-state.json'), 'utf8')
  ) as BuilderState;

  writeFileSync(join(harborRoot, 'task.toml'), renderTaskToml(taskId, state.metadata), 'utf8');
  writeFileSync(join(harborRoot, 'environment', 'Dockerfile'), renderTaskDockerfile(hasSidecar), 'utf8');

  writeFileSync(join(draftRoot, '.complete'), '', 'utf8');
}

export function cloneHarborToDraft(config: TaskBuilderConfig, harborTaskId: string, newDraftId: string): void {
  const harborRoot = join(config.harborTasksDir, harborTaskId);
  const draftRoot = join(config.tasksDir, newDraftId);

  if (!existsSync(harborRoot)) {
    throw new Error(`Harbor task not found: ${harborTaskId}`);
  }
  if (existsSync(draftRoot)) {
    throw new Error(`Draft already exists: ${newDraftId}`);
  }

  cpSync(harborRoot, draftRoot, { recursive: true });

  const now = new Date().toISOString();
  const builderState: BuilderState = {
    id: newDraftId,
    name: newDraftId,
    created_at: now,
    updated_at: now,
    current_step: 'instruction',
    metadata: {
      description: `Figma design task: ${newDraftId}`,
      difficulty: 'easy',
      category: 'design',
      verifier_timeout_sec: 300,
      agent_timeout_sec: 600,
    },
    export: { completed: existsSync(join(draftRoot, 'environment', 'design.hfc.json')), mode: 'full' },
  };

  writeFileSync(join(draftRoot, 'builder-state.json'), JSON.stringify(builderState, null, 2) + '\n', 'utf8');
  rmSync(join(draftRoot, 'task.toml'), { force: true });
  rmSync(join(draftRoot, 'environment', 'Dockerfile'), { force: true });
  rmSync(join(draftRoot, '.complete'), { force: true });
}
