import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = join(root, 'plugin');
const srcDir = join(pluginRoot, 'src');
const outDir = join(pluginRoot, 'build');

mkdirSync(outDir, { recursive: true });

const uiHtml = readFileSync(join(srcDir, 'ui.html'), 'utf8');

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

copyFileSync(join(srcDir, 'ui.html'), join(outDir, 'ui.html'));

console.log('Plugin built to plugin/build/ (import plugin/manifest.json in Figma)');
