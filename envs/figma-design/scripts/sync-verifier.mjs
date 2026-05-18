import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const EVAL_SPEC_FILE = 'eval-spec.json';

/** RewardKit entrypoints copied into each task's tests/ (engine lives in base image). */
export const TASK_TEST_FILES = ['check.py', 'test.sh'];

/**
 * Sync thin task tests/ from shared/verifier (check.py, test.sh), keeping eval-spec.json.
 * figma_eval is installed in the base image at /opt/figma-verifier.
 */
export function syncVerifierToTask(taskRoot, sharedVerifierDir, { preserveEvalSpec = true } = {}) {
  const testsDir = join(taskRoot, 'tests');
  const evalSpecPath = join(testsDir, EVAL_SPEC_FILE);

  let evalSpecContent = null;
  if (preserveEvalSpec && existsSync(evalSpecPath)) {
    evalSpecContent = readFileSync(evalSpecPath, 'utf8');
  }

  if (existsSync(testsDir)) {
    rmSync(testsDir, { recursive: true, force: true });
  }
  mkdirSync(testsDir, { recursive: true });

  for (const name of TASK_TEST_FILES) {
    const src = join(sharedVerifierDir, name);
    if (!existsSync(src)) {
      throw new Error(`Missing shared verifier file: ${src}`);
    }
    cpSync(src, join(testsDir, name));
  }

  if (evalSpecContent !== null) {
    writeFileSync(join(testsDir, EVAL_SPEC_FILE), evalSpecContent, 'utf8');
  }
}

/**
 * Copy task-root instruction.md into environment/ for Docker build context.
 * Harbor reads instruction from the task root; the per-task Dockerfile COPYs from environment/.
 */
export function syncInstructionToEnvironment(taskRoot) {
  const instructionPath = join(taskRoot, 'instruction.md');
  if (!existsSync(instructionPath)) {
    throw new Error(`Missing instruction.md: ${instructionPath}`);
  }
  const envDir = join(taskRoot, 'environment');
  mkdirSync(envDir, { recursive: true });
  cpSync(instructionPath, join(envDir, 'instruction.md'));
}