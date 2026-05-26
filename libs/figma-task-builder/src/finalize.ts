import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskBuilderConfig } from './config.js';
import type { BuilderState } from './types.js';
import { assertUniqueCheckIds, validateEvalSpec } from './eval-spec-validator.js';
import { validateDesignSpec, type DesignSpec } from './design-spec-validator.js';
import { addTaskToDatasetManifest } from './harbor-dataset.js';

const TASK_TEST_FILES = ['check.py', 'test.sh'] as const;
const EVAL_SPEC_FILE = 'eval-spec.json';
const DESIGN_SPEC_FILE = 'design-spec.json';

/** Keep in sync with envs/figma-design/scripts/dockerfile-template.mjs */
function renderTaskDockerfile(): string {
  const lines = [
    'FROM metaphi/figma-design-base:latest',
    '',
    'COPY design-spec.json /environment/design-spec.json',
    'COPY instruction.md /tests/instruction.md',
    'COPY assets/ /app/assets/',
    '',
    'RUN node /opt/figma-design/scripts/prepare-task-design.mjs \\',
    '  --spec /environment/design-spec.json',
    '',
    'ENV HFC_INITIAL_FILE=/data/workspace/design.hfc.json',
    'ENV HFC_PREVIEW_ON_LOAD=0',
    '',
  ];
  return `${lines.join('\n')}`;
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

[verifier.env]
EVAL_JUDGE_MODEL = "\${EVAL_JUDGE_MODEL:-gemini/gemini-3.1-pro-preview}"
ANTHROPIC_API_KEY = "\${ANTHROPIC_API_KEY:-}"
OPENAI_API_KEY = "\${OPENAI_API_KEY:-}"
GEMINI_API_KEY = "\${GEMINI_API_KEY:-}"

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
`;
}

function designExportPath(config: TaskBuilderConfig, base: string): string {
  return join(config.designsDir, base, 'design.hfc.json');
}

export function assertDesignBaseExists(config: TaskBuilderConfig, base: string): void {
  if (!existsSync(designExportPath(config, base))) {
    throw new Error(`DESIGN_NOT_FOUND: design export "${base}" not found in designs library`);
  }
}

export function finalizeTask(config: TaskBuilderConfig, taskId: string): void {
  const draftRoot = join(config.tasksDir, taskId);
  const harborRoot = join(config.harborTasksDir, taskId);

  if (!existsSync(draftRoot)) {
    throw new Error(`Draft not found: ${taskId}`);
  }

  const designSpecPath = join(draftRoot, 'environment', DESIGN_SPEC_FILE);
  if (!existsSync(designSpecPath)) {
    throw new Error('Design spec required: environment/design-spec.json missing');
  }

  const designSpec = JSON.parse(readFileSync(designSpecPath, 'utf8')) as DesignSpec;
  validateDesignSpec(config.designSpecSchemaPath, designSpec);
  assertDesignBaseExists(config, designSpec.base);

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

  mkdirSync(harborRoot, { recursive: true });
  mkdirSync(join(harborRoot, 'environment'), { recursive: true });
  mkdirSync(join(harborRoot, 'tests'), { recursive: true });

  const envDraft = join(draftRoot, 'environment');
  const envHarbor = join(harborRoot, 'environment');
  mkdirSync(envHarbor, { recursive: true });
  cpSync(designSpecPath, join(envHarbor, DESIGN_SPEC_FILE));
  if (existsSync(join(envDraft, 'assets'))) {
    cpSync(join(envDraft, 'assets'), join(envHarbor, 'assets'), { recursive: true });
  }
  cpSync(instructionPath, join(harborRoot, 'instruction.md'));
  cpSync(instructionPath, join(envHarbor, 'instruction.md'));

  for (const name of TASK_TEST_FILES) {
    cpSync(join(config.sharedVerifierDir, name), join(harborRoot, 'tests', name));
  }
  cpSync(evalSpecPath, join(harborRoot, 'tests', EVAL_SPEC_FILE));

  const state = JSON.parse(
    readFileSync(join(draftRoot, 'builder-state.json'), 'utf8')
  ) as BuilderState;

  writeFileSync(join(harborRoot, 'task.toml'), renderTaskToml(taskId, state.metadata), 'utf8');
  writeFileSync(join(harborRoot, 'environment', 'Dockerfile'), renderTaskDockerfile(), 'utf8');

  addTaskToDatasetManifest(config, taskId);

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

  const designSpecPath = join(draftRoot, 'environment', DESIGN_SPEC_FILE);
  const designSpec = existsSync(designSpecPath)
    ? (JSON.parse(readFileSync(designSpecPath, 'utf8')) as DesignSpec)
    : null;

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
    design: {
      completed: designSpec !== null,
      base: designSpec?.base,
      node_exclusions: designSpec?.node_exclusions,
    },
  };

  writeFileSync(join(draftRoot, 'builder-state.json'), JSON.stringify(builderState, null, 2) + '\n', 'utf8');
  rmSync(join(draftRoot, 'task.toml'), { force: true });
  rmSync(join(draftRoot, 'environment', 'Dockerfile'), { force: true });
  rmSync(join(draftRoot, '.complete'), { force: true });
}
