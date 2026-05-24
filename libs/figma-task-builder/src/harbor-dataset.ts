import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { TaskBuilderConfig } from './config.js';

function harborBin(): string {
  return process.env.TB_HARBOR_BIN?.trim() || 'harbor';
}

export function shouldSkipHarborAdd(): boolean {
  return process.env.TB_SKIP_HARBOR_ADD?.trim() === '1';
}

export function addTaskToDatasetManifest(config: TaskBuilderConfig, taskId: string): void {
  if (shouldSkipHarborAdd()) {
    return;
  }

  if (!existsSync(config.datasetTomlPath)) {
    throw new Error(`HARBOR_ADD_FAILED: dataset manifest not found at ${config.datasetTomlPath}`);
  }

  const taskPath = join('tasks', taskId);
  const harborTaskDir = join(config.harborTasksDir, taskId);
  if (!existsSync(harborTaskDir)) {
    throw new Error(`HARBOR_ADD_FAILED: harbor task not found at ${harborTaskDir}`);
  }

  const result = spawnSync(
    harborBin(),
    ['add', taskPath, '--to', config.datasetTomlPath],
    {
      cwd: config.datasetRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  if (result.error) {
    const detail = result.error.message;
    if (detail.includes('ENOENT')) {
      throw new Error(
        `HARBOR_ADD_FAILED: "${harborBin()}" not found on PATH. Install Harbor CLI or set TB_HARBOR_BIN.`
      );
    }
    throw new Error(`HARBOR_ADD_FAILED: ${detail}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const detail = stderr || stdout || `exit code ${result.status ?? 'unknown'}`;
    throw new Error(`HARBOR_ADD_FAILED: ${detail}`);
  }
}
