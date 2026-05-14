#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/loadConfig.js';
import { DocumentEngine } from './engine/DocumentEngine.js';
import { JsonPersistence } from './persistence/JsonPersistence.js';
import { createHeadlessMcpServer } from './mcp/registerTools.js';
import { createHttpServer } from './server/createHttpServer.js';
import { createConsoleLogger } from './util/logger.js';

function readPkgVersion(): string {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
  const pkg = JSON.parse(readFileSync(root, 'utf8')) as { version?: string };
  return pkg.version ?? '0.0.0';
}

function parseArgv(argv: string[]): {
  transport: 'http' | 'stdio';
  httpHost?: string;
  httpPort?: number;
  initialFile?: string;
} {
  let transport: 'http' | 'stdio' = 'http';
  let httpHost: string | undefined;
  let httpPort: number | undefined;
  let initialFile: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--debug') {
      process.env.HFC_ALLOW_DEBUG = '1';
      continue;
    }
    if (a === '--transport' && argv[i + 1]) {
      const v = argv[++i]!;
      if (v === 'http' || v === 'stdio') transport = v;
      continue;
    }
    if (a === '--http-host' && argv[i + 1]) {
      httpHost = argv[++i]!;
      continue;
    }
    if (a === '--http-port' && argv[i + 1]) {
      httpPort = Number.parseInt(argv[++i]!, 10);
      continue;
    }
    if (a === '--file' && argv[i + 1]) {
      initialFile = argv[++i]!;
      continue;
    }
  }
  if (httpHost) process.env.HFC_HTTP_HOST = httpHost;
  if (httpPort !== undefined && Number.isFinite(httpPort)) process.env.HFC_HTTP_PORT = String(httpPort);
  return { transport, httpHost, httpPort, initialFile };
}

async function main(): Promise<void> {
  const version = readPkgVersion();
  const argvOpts = parseArgv(process.argv);
  const config = loadConfig({ version, cliInitialFile: argvOpts.initialFile ?? null });
  const logger = createConsoleLogger(config.logLevel);
  const persistence = new JsonPersistence();
  const engine = new DocumentEngine({ persistence, logger });

  if (config.initialFilePath) {
    await engine.loadFromDisk({ absolutePath: config.initialFilePath });
    logger.info('startup_initial_file', { path: config.initialFilePath });
  }

  if (argvOpts.transport === 'stdio') {
    const mcp = createHeadlessMcpServer({
      engine,
      screenshotTimeoutMs: config.screenshotTimeoutMs,
      screenshotDefaultBackground: config.screenshotDefaultBackground,
      screenshotDefaultDeviceScaleFactor: config.screenshotDefaultDeviceScaleFactor,
    });
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    logger.info('stdio_mcp_ready');
    return;
  }

  const { port, close } = await createHttpServer({ config, engine, logger });
  logger.info('http_listening', { host: config.httpHost, port });
  const shutdown = async () => {
    await close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
