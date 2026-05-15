#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, parseArgv } from './config.js';
import { PluginBridge } from './bridge/PluginBridge.js';
import { ScreenshotAssetStore } from './bridge/ScreenshotAssetStore.js';
import { createHttpServer } from './server/createHttpServer.js';

function readPkgVersion(): string {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  const pkg = JSON.parse(readFileSync(root, 'utf8')) as { version?: string };
  return pkg.version ?? '0.0.0';
}

async function main(): Promise<void> {
  parseArgv(process.argv);
  const config = loadConfig(readPkgVersion());
  const bridge = new PluginBridge(config.toolTimeoutMs);
  const screenshotStore = new ScreenshotAssetStore(config.screenshotAssetTtlMs);

  const { port, close } = await createHttpServer({
    config,
    bridge,
    screenshotStore,
  });

  const mcpUrl = `http://${config.httpHost}:${port}/mcp`;
  const wsUrl = `ws://${config.httpHost}:${port}/plugin`;

  console.log(`local-figma-mcp listening on ${config.httpHost}:${port}`);
  console.log(`  MCP:       ${mcpUrl}`);
  console.log(`  Plugin WS: ${wsUrl}`);
  console.log(`  Health:    http://${config.httpHost}:${port}/health`);

  const shutdown = async (): Promise<void> => {
    await close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
