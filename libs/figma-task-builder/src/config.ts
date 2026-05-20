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
  hfcUrl: string;
  exportDir: string;
  exportSessionsDir: string;
  sharedVerifierDir: string;
  evalSpecSchemaPath: string;
}

export function loadConfig(): TaskBuilderConfig {
  const tasksDir =
    process.env.TB_TASKS_DIR?.trim() ||
    join(repoRoot, 'envs', 'figma-design', 'task-drafts');
  const harborTasksDir =
    process.env.TB_HARBOR_TASKS_DIR?.trim() ||
    join(repoRoot, 'envs', 'figma-design', 'tasks');

  const resolvedTasksDir = resolve(tasksDir);
  return {
    httpHost: process.env.TB_HTTP_HOST?.trim() || '127.0.0.1',
    httpPort: Number(process.env.TB_HTTP_PORT ?? '3856'),
    tasksDir: resolvedTasksDir,
    harborTasksDir: resolve(harborTasksDir),
    hfcUrl: (process.env.TB_HFC_URL?.trim() || 'http://127.0.0.1:3847').replace(/\/$/, ''),
    exportSessionsDir: join(resolvedTasksDir, '.export-sessions'),
    exportDir:
      process.env.TB_EXPORT_DIR?.trim() ||
      join(homedir(), '.headless-figma-clone', 'workspace'),
    sharedVerifierDir: join(repoRoot, 'envs', 'figma-design', 'shared', 'verifier'),
    evalSpecSchemaPath: join(
      repoRoot,
      'envs',
      'figma-design',
      'shared',
      'verifier',
      'eval-spec.schema.json'
    ),
  };
}

export { repoRoot };
