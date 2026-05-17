import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const EVAL_SPEC_FILE = 'eval-spec.json';

/**
 * Replace a task's tests/ with shared/verifier, optionally keeping eval-spec.json.
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

  cpSync(sharedVerifierDir, testsDir, { recursive: true });

  if (evalSpecContent !== null) {
    writeFileSync(join(testsDir, EVAL_SPEC_FILE), evalSpecContent, 'utf8');
  }
}
