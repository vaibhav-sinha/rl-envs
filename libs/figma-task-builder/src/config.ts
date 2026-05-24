import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const repoRoot = resolve(packageDir, '..', '..');

export interface TaskBuilderConfig {
  httpHost: string;
  httpPort: number;
  tasksDir: string;
  harborTasksDir: string;
  datasetRoot: string;
  datasetTomlPath: string;
  hfcUrl: string;
  designsDir: string;
  exportSessionsDir: string;
  sharedVerifierDir: string;
  evalSpecSchemaPath: string;
  designSpecSchemaPath: string;
}

export function loadConfig(): TaskBuilderConfig {
  const tasksDir =
    process.env.TB_TASKS_DIR?.trim() ||
    join(repoRoot, 'envs', 'figma-design', 'task-drafts');
  const harborTasksDir =
    process.env.TB_HARBOR_TASKS_DIR?.trim() ||
    join(repoRoot, 'envs', 'figma-design', 'tasks');
  const datasetRoot =
    process.env.TB_DATASET_ROOT?.trim() ||
    join(repoRoot, 'envs', 'figma-design');

  const resolvedTasksDir = resolve(tasksDir);
  const resolvedDatasetRoot = resolve(datasetRoot);
  return {
    httpHost: process.env.TB_HTTP_HOST?.trim() || '127.0.0.1',
    httpPort: Number(process.env.TB_HTTP_PORT ?? '3856'),
    tasksDir: resolvedTasksDir,
    harborTasksDir: resolve(harborTasksDir),
    datasetRoot: resolvedDatasetRoot,
    datasetTomlPath: join(resolvedDatasetRoot, 'dataset.toml'),
    hfcUrl: (process.env.TB_HFC_URL?.trim() || 'http://127.0.0.1:3847').replace(/\/$/, ''),
    exportSessionsDir: join(resolvedTasksDir, '.export-sessions'),
    designsDir:
      process.env.TB_DESIGNS_DIR?.trim() ||
      join(repoRoot, 'envs', 'figma-design', 'designs'),
    sharedVerifierDir: join(repoRoot, 'envs', 'figma-design', 'shared', 'verifier'),
    evalSpecSchemaPath: join(
      repoRoot,
      'envs',
      'figma-design',
      'shared',
      'verifier',
      'eval-spec.schema.json'
    ),
    designSpecSchemaPath: join(
      repoRoot,
      'envs',
      'figma-design',
      'shared',
      'design-spec.schema.json'
    ),
  };
}

export { repoRoot };
