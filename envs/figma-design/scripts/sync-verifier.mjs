import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DESIGN_METADATA_FILE = 'design-metadata.json';

/**
 * Replace a task's tests/ with shared/verifier, optionally keeping design-metadata.json.
 */
export function syncVerifierToTask(taskRoot, sharedVerifierDir, { preserveMetadata = true } = {}) {
  const testsDir = join(taskRoot, 'tests');
  const metadataPath = join(testsDir, DESIGN_METADATA_FILE);

  let metadataContent = null;
  if (preserveMetadata && existsSync(metadataPath)) {
    metadataContent = readFileSync(metadataPath, 'utf8');
  }

  if (existsSync(testsDir)) {
    rmSync(testsDir, { recursive: true, force: true });
  }
  mkdirSync(testsDir, { recursive: true });

  cpSync(sharedVerifierDir, testsDir, { recursive: true });

  if (metadataContent !== null) {
    writeFileSync(join(testsDir, DESIGN_METADATA_FILE), metadataContent, 'utf8');
  }
}
