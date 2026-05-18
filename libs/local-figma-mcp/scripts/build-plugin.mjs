import * as esbuild from 'esbuild';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(root, 'plugin');
const uiRoot = join(pluginRoot, 'ui');
const srcDir = join(pluginRoot, 'src');
const outDir = join(pluginRoot, 'build');

mkdirSync(outDir, { recursive: true });

console.log('Building plugin UI (Vite, single-file)…');
execSync('npx vite build', { cwd: uiRoot, stdio: 'inherit' });

// Figma showUI() takes inline HTML only (__html__), not a file path. Bundle JS/CSS into one file.
const uiHtml = readFileSync(join(uiRoot, 'dist', 'index.html'), 'utf8');

await esbuild.build({
  entryPoints: [join(srcDir, 'code.ts')],
  bundle: true,
  outfile: join(outDir, 'code.js'),
  target: 'es2017',
  format: 'iife',
  platform: 'browser',
  define: {
    __html__: JSON.stringify(uiHtml),
  },
  logLevel: 'info',
});

copyFileSync(join(uiRoot, 'dist', 'index.html'), join(outDir, 'ui.html'));

// Paths in plugin/manifest.json are relative to plugin/; Figma resolves them from the
// manifest directory, so build/manifest.json must use code.js / ui.html (not build/…).
const manifest = JSON.parse(readFileSync(join(pluginRoot, 'manifest.json'), 'utf8'));
manifest.main = 'code.js';
manifest.ui = 'ui.html';
writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log('Plugin built to plugin/build/ (import plugin/manifest.json in Figma)');
