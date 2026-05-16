import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package root (libs/headless-figma-clone), whether running from src/ or dist/. */
export function getPackageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/fonts or src/fonts -> ../..
  return join(here, '..', '..');
}

export function getDefaultFontsDir(): string {
  return join(getPackageRoot(), 'fonts');
}
