#!/usr/bin/env node
/**
 * Package the figma-design environment for external distribution.
 *
 *   node scripts/package-figma-design-release.mjs
 *   node scripts/package-figma-design-release.mjs --output releases/my-bundle.zip
 *   node scripts/package-figma-design-release.mjs --dry-run
 *   node scripts/package-figma-design-release.mjs --skip-hfc-build
 *
 * Creates a zip with runtime-only files: tasks, designs, verifiers, prebuilt HFC
 * (dist + fonts), and a distribution README. Git history and dev-only libs are
 * excluded.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), '..');
const datasetRoot = join(repoRoot, 'envs', 'figma-design');
const hfcRoot = join(repoRoot, 'libs', 'headless-figma-clone');
const bundleDirName = 'figma-design-eval';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const skipHfcBuild = argv.includes('--skip-hfc-build');

function argValue(flag) {
  const idx = argv.indexOf(flag);
  if (idx === -1 || idx === argv.length - 1) return undefined;
  return argv[idx + 1];
}

const MIN_DESIGN_BYTES = 10_000;
const LFS_POINTER_PREFIX = 'version https://git-lfs.github.com/spec/v1';

const DATASET_SCRIPT_ALLOW = new Set([
  'build-base.mjs',
  'prepare-task-design.mjs',
  'prune-hfc.mjs',
]);

const DATASET_DIR_EXCLUDE = new Set([
  'task-drafts',
  'docs',
  '.git',
  'node_modules',
  '__pycache__',
  '.pytest_cache',
  '.ruff_cache',
  '.mypy_cache',
  '.venv',
]);

const DATASET_FILE_EXCLUDE = new Set([
  'README.md',
  'README.dist.md',
  '.gitignore',
  'dist.tar.gz',
]);

const HFC_RUNTIME_ENTRIES = ['package.json', 'package-lock.json', 'dist', 'fonts'];

function log(message) {
  console.log(message);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().slice(0, 10);
  return join(repoRoot, 'releases', `${bundleDirName}-${stamp}.zip`);
}

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function assertDesignsMaterialized() {
  const designsRoot = join(datasetRoot, 'designs');
  if (!isDirectory(designsRoot)) {
    fail(`Missing designs directory: ${designsRoot}`);
  }

  const exports = readdirSync(designsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (exports.length === 0) {
    fail('No design exports found under envs/figma-design/designs/');
  }

  for (const exportName of exports) {
    const designPath = join(designsRoot, exportName, 'design.hfc.json');
    if (!existsSync(designPath)) {
      fail(`Missing design file: ${designPath}`);
    }
    const size = statSync(designPath).size;
    if (size < MIN_DESIGN_BYTES) {
      const head = readFileSync(designPath, 'utf8').slice(0, 80);
      if (head.startsWith(LFS_POINTER_PREFIX)) {
        fail(
          `${designPath} is a Git LFS pointer (${size} bytes). Run git lfs pull before packaging.`,
        );
      }
      fail(`${designPath} is too small (${size} bytes). Expected a materialized design export.`);
    }
    log(`  OK ${exportName}/design.hfc.json (${(size / 1024 / 1024).toFixed(1)} MB)`);
  }
}

function buildHfc() {
  log('Building headless-figma-clone...');
  const install = spawnSync('npm', ['ci'], {
    cwd: hfcRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (install.status !== 0) {
    fail('npm ci failed in libs/headless-figma-clone');
  }

  const build = spawnSync('npm', ['run', 'build'], {
    cwd: hfcRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (build.status !== 0) {
    fail('npm run build failed in libs/headless-figma-clone');
  }

  if (!existsSync(join(hfcRoot, 'dist', 'cli.js'))) {
    fail('Expected libs/headless-figma-clone/dist/cli.js after build');
  }
}

function listTasks() {
  const tasksRoot = join(datasetRoot, 'tasks');
  return readdirSync(tasksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function formatTaskList(tasks) {
  return tasks.map((task) => `- \`${task}\``).join('\n');
}

function shouldSkipDatasetEntry(relPath, name, isDir) {
  if (isDir && DATASET_DIR_EXCLUDE.has(name)) return true;
  if (!isDir && DATASET_FILE_EXCLUDE.has(name)) return true;

  const parts = relPath.split(/[/\\]/);
  if (!isDir && parts[0] === 'scripts' && !DATASET_SCRIPT_ALLOW.has(name)) {
    return true;
  }

  if (name === 'node_modules' || name.startsWith('.')) {
    if (name === '.gitkeep') return false;
    if (name.startsWith('.') && name !== '.gitkeep') return true;
  }

  return false;
}

function copyDatasetRecursive(srcRoot, destRoot, rel = '') {
  const currentSrc = rel ? join(srcRoot, rel) : srcRoot;
  const entries = readdirSync(currentSrc, { withFileTypes: true });

  for (const entry of entries) {
    const entryRel = rel ? join(rel, entry.name) : entry.name;
    if (shouldSkipDatasetEntry(entryRel, entry.name, entry.isDirectory())) {
      continue;
    }

    const srcPath = join(srcRoot, entryRel);
    const destPath = join(destRoot, entryRel);

    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDatasetRecursive(srcRoot, destRoot, entryRel);
    } else if (entry.isFile()) {
      mkdirSync(dirname(destPath), { recursive: true });
      cpSync(srcPath, destPath);
    }
  }
}

function copyHfcRuntime(destRoot) {
  const destHfc = join(destRoot, 'libs', 'headless-figma-clone');
  mkdirSync(destHfc, { recursive: true });

  for (const entry of HFC_RUNTIME_ENTRIES) {
    const srcPath = join(hfcRoot, entry);
    if (!existsSync(srcPath)) {
      fail(`Missing HFC runtime path: ${srcPath}`);
    }
    const destPath = join(destHfc, entry);
    cpSync(srcPath, destPath, { recursive: true });
  }
}

function writeDistributionReadme(destRoot, tasks) {
  const templatePath = join(datasetRoot, 'README.dist.md');
  if (!existsSync(templatePath)) {
    fail(`Missing distribution README template: ${templatePath}`);
  }
  const template = readFileSync(templatePath, 'utf8');
  const readme = template.replace('{{TASK_LIST}}', formatTaskList(tasks));
  writeFileSync(join(destRoot, 'README.md'), readme, 'utf8');
}

function createZip(stagingRoot, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  if (existsSync(outputPath)) {
    rmSync(outputPath, { force: true });
  }

  const tarResult = spawnSync(
    'tar',
    ['-a', '-cf', outputPath, '-C', stagingRoot, bundleDirName],
    { stdio: 'inherit', cwd: repoRoot },
  );
  if (tarResult.status === 0) {
    return;
  }

  if (process.platform === 'win32') {
    const psCommand = [
      `Compress-Archive -Path '${join(stagingRoot, bundleDirName).replace(/'/g, "''")}'`,
      `-DestinationPath '${outputPath.replace(/'/g, "''")}'`,
      '-Force',
    ].join(' ');
    const psResult = spawnSync(
      'powershell',
      ['-NoProfile', '-Command', psCommand],
      { stdio: 'inherit' },
    );
    if (psResult.status === 0) {
      return;
    }
  }

  fail('Failed to create zip (tried tar and PowerShell Compress-Archive)');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function dirSize(root) {
  let total = 0;
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        total += lstatSync(full).size;
      }
    }
  }
  return total;
}

function main() {
  const outputPath = resolve(argValue('--output') ?? defaultOutputPath());
  const stagingRoot = join(repoRoot, 'releases', `.staging-${Date.now()}`);
  const bundleRoot = join(stagingRoot, bundleDirName);

  log('Preflight checks...');
  assertDesignsMaterialized();

  if (!skipHfcBuild && !dryRun) {
    buildHfc();
  } else if (!existsSync(join(hfcRoot, 'dist', 'cli.js'))) {
    fail('dist/cli.js missing; run without --skip-hfc-build or build HFC first');
  }

  const tasks = listTasks();
  log(`Tasks: ${tasks.join(', ')}`);

  if (dryRun) {
    log('Dry run — would create:');
    log(`  ${outputPath}`);
    log(`  Bundle root: ${bundleDirName}/`);
    log(`  Tasks: ${tasks.length}`);
    return;
  }

  log('Staging bundle...');
  mkdirSync(bundleRoot, { recursive: true });

  cpSync(join(repoRoot, 'requirements.txt'), join(bundleRoot, 'requirements.txt'));
  mkdirSync(join(bundleRoot, 'envs', 'figma-design'), { recursive: true });
  copyDatasetRecursive(datasetRoot, join(bundleRoot, 'envs', 'figma-design'));
  copyHfcRuntime(bundleRoot);
  writeDistributionReadme(bundleRoot, tasks);

  const size = dirSize(bundleRoot);
  log(`Staged ${formatBytes(size)}`);

  log(`Creating zip: ${outputPath}`);
  createZip(stagingRoot, outputPath);

  rmSync(stagingRoot, { recursive: true, force: true });

  const zipSize = statSync(outputPath).size;
  log('');
  log(`Done: ${outputPath} (${formatBytes(zipSize)})`);
  log('');
  log('Recipients should:');
  log('  1. Unzip and cd into figma-design-eval/');
  log('  2. node envs/figma-design/scripts/build-base.mjs');
  log('  3. export GEMINI_API_KEY=...');
  log('  4. harbor run -p envs/figma-design/tasks/<task-id> --env docker -a terminus-2 -m <model>');
}

main();
