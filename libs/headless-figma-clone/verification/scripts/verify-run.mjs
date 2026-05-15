#!/usr/bin/env node
/**
 * Run all verification scenarios against Figma + clone MCP servers and save PNGs.
 *
 * Usage:
 *   node verification/scripts/verify-run.mjs
 *   node verification/scripts/verify-run.mjs --from 1 --to 10
 *   node verification/scripts/verify-run.mjs --figma-url http://127.0.0.1:3855 --clone-url http://127.0.0.1:3847
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  captureScreenshot,
  connectMcp,
  getToolText,
  parseUseFigmaResult,
} from './mcp-client.mjs';

const VERIFY_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const FIGMA_CLEANUP = `
for (const node of figma.currentPage.findAll((n) => n.name === 'ScenarioRoot')) {
  node.remove();
}
`.trim();

function parseArgs(argv) {
  let verifyDir = VERIFY_ROOT;
  let figmaUrl = 'http://127.0.0.1:3855';
  let cloneUrl = 'http://127.0.0.1:3847';
  let from = 1;
  let to = Infinity;
  let only = 'both';
  let failFast = false;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' && argv[i + 1]) {
      verifyDir = argv[++i];
      continue;
    }
    if (a === '--figma-url' && argv[i + 1]) {
      figmaUrl = argv[++i];
      continue;
    }
    if (a === '--clone-url' && argv[i + 1]) {
      cloneUrl = argv[++i];
      continue;
    }
    if (a === '--from' && argv[i + 1]) {
      from = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (a === '--to' && argv[i + 1]) {
      to = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (a === '--only' && argv[i + 1]) {
      only = argv[++i];
      continue;
    }
    if (a === '--fail-fast') {
      failFast = true;
      continue;
    }
  }

  if (!['both', 'figma', 'clone'].includes(only)) {
    throw new Error('--only must be both, figma, or clone');
  }

  return { verifyDir, figmaUrl, cloneUrl, from, to, only, failFast };
}

/** Placeholder for Figma MCP tool schemas; local-figma-mcp ignores fileKey and uses the open file. */
const FIGMA_FILE_KEY_PLACEHOLDER = 'active';

/**
 * @param {string} baseUrl
 * @returns {Promise<{ fileName: string | null }>}
 */
async function assertFigmaPluginReady(baseUrl) {
  const healthUrl = new URL(baseUrl);
  healthUrl.pathname = '/health';
  const res = await fetch(healthUrl);
  if (!res.ok) {
    throw new Error(`Figma health ${res.status}: ${healthUrl}`);
  }
  const body = await res.json();
  if (!body.pluginConnected) {
    throw new Error(
      'Figma plugin not connected. Open Figma Desktop, run the Local Figma MCP plugin, and ensure it shows Connected.'
    );
  }
  const fileName = typeof body.fileName === 'string' ? body.fileName : null;
  return { fileName };
}

/**
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @param {string} code
 * @param {{ description?: string; figma?: boolean; cleanup?: boolean }} opts
 */
async function runUseFigma(client, code, opts) {
  const parts = [];
  if (opts.cleanup) parts.push(FIGMA_CLEANUP);
  parts.push(code.trim());
  const merged = parts.join('\n\n');

  const args = { code: merged };
  if (opts.description) args.description = opts.description;
  if (opts.figma) args.fileKey = FIGMA_FILE_KEY_PLACEHOLDER;

  const run = await client.callTool({ name: 'use_figma', arguments: args });
  return parseUseFigmaResult(getToolText(run));
}

/**
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @param {string} scenarioDir
 * @param {string} code
 * @param {string} description
 */
async function captureClone(client, scenarioDir, code, description) {
  await client.callTool({
    name: 'create_new_file',
    arguments: { name: `verify-${scenarioDir.split(/[/\\]/).pop()}` },
  });

  const { rootId } = await runUseFigma(client, code, { description });
  const img = await captureScreenshot(client, rootId, { background: 'white' });
  const out = join(scenarioDir, 'clone.png');
  writeFileSync(out, Buffer.from(img.data, 'base64'));
  return { rootId, out, width: img.meta.width, height: img.meta.height };
}

/**
 * @param {import('@modelcontextprotocol/sdk/client/index.js').Client} client
 * @param {string} scenarioDir
 * @param {string} code
 * @param {string} description
 * @param {number} maxDimension Figma export cap (longer side); use manifest viewport to match clone 1:1
 */
async function captureFigma(client, scenarioDir, code, description, maxDimension) {
  const { rootId } = await runUseFigma(client, code, {
    description,
    figma: true,
    cleanup: true,
  });
  const img = await captureScreenshot(client, rootId, { figma: true, maxDimension });
  const out = join(scenarioDir, 'figma.png');
  writeFileSync(out, Buffer.from(img.data, 'base64'));
  return { rootId, out, width: img.meta.width, height: img.meta.height };
}

async function main() {
  const opts = parseArgs(process.argv);
  const manifestPath = join(opts.verifyDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const scenarios = [...manifest.scenarios]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.order >= opts.from && s.order <= opts.to);

  if (scenarios.length === 0) {
    console.error('No scenarios in range');
    process.exit(1);
  }

  const viewportMaxDim = Math.max(manifest.viewport?.width ?? 480, manifest.viewport?.height ?? 360);

  /** @type {import('@modelcontextprotocol/sdk/client/index.js').Client | null} */
  let figmaClient = null;
  /** @type {import('@modelcontextprotocol/sdk/client/index.js').Client | null} */
  let cloneClient = null;
  const results = { ok: [], failed: [] };

  try {
    if (opts.only === 'both' || opts.only === 'figma') {
      console.log(`Connecting to Figma MCP at ${opts.figmaUrl}…`);
      figmaClient = await connectMcp(opts.figmaUrl);
      const figmaHealth = await assertFigmaPluginReady(opts.figmaUrl);
      console.log(
        figmaHealth.fileName
          ? `Figma plugin ready (open file: ${figmaHealth.fileName})`
          : 'Figma plugin ready (uses whichever design file is open in Desktop)'
      );
    }
    if (opts.only === 'both' || opts.only === 'clone') {
      console.log(`Connecting to Clone MCP at ${opts.cloneUrl}…`);
      cloneClient = await connectMcp(opts.cloneUrl);
    }

    for (const entry of scenarios) {
      const scenarioDir = join(opts.verifyDir, 'scenarios', entry.id);
      const code = readFileSync(join(scenarioDir, 'script.js'), 'utf8');
      const descriptionPath = join(scenarioDir, 'description.txt');
      let description = entry.title;
      try {
        const descText = readFileSync(descriptionPath, 'utf8').trim();
        const firstLine = descText.split('\n')[0]?.trim();
        if (firstLine) description = firstLine.slice(0, 2000);
      } catch {
        /* use title */
      }

      const line = `[${String(entry.order).padStart(3, '0')}/${String(manifest.scenarios.length).padStart(3, '0')}] ${entry.id}`;
      process.stdout.write(`${line} … `);

      try {
        const parts = [];
        if ((opts.only === 'both' || opts.only === 'clone') && cloneClient) {
          const c = await captureClone(cloneClient, scenarioDir, code, description);
          parts.push(`clone→${c.out}`);
        }
        if ((opts.only === 'both' || opts.only === 'figma') && figmaClient) {
          const f = await captureFigma(figmaClient, scenarioDir, code, description, viewportMaxDim);
          parts.push(`figma→${f.out}`);
        }
        console.log(`ok  ${parts.join(' ')}`);
        results.ok.push(entry.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`FAIL  ${msg}`);
        results.failed.push({ id: entry.id, error: msg });
        if (opts.failFast) {
          process.exitCode = 1;
          break;
        }
      }
    }
  } finally {
    if (figmaClient) await figmaClient.close().catch(() => {});
    if (cloneClient) await cloneClient.close().catch(() => {});
  }

  console.log(`\nDone: ${results.ok.length} ok, ${results.failed.length} failed`);
  if (results.failed.length > 0) {
    for (const f of results.failed) {
      console.error(`  - ${f.id}: ${f.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
