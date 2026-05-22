/**
 * Bootstrap HFC HTTP at 512MB with oker design already loaded (no asset dir copy).
 * Usage: node --max-old-space-size=512 scripts/hfc-oker-agent-bootstrap.mjs <designPath> <port>
 */
import { createConsoleLogger } from '../dist/util/logger.js';
import { DocumentEngine } from '../dist/engine/DocumentEngine.js';
import { JsonPersistence } from '../dist/persistence/JsonPersistence.js';
import { loadConfig } from '../dist/config/loadConfig.js';
import { createHttpServer } from '../dist/server/createHttpServer.js';
import { setFontsDir } from '../dist/fonts/localFontRegistry.js';

const designPath = process.argv[2];
const port = Number.parseInt(process.argv[3] ?? '', 10);
if (!designPath || !Number.isFinite(port)) {
  console.error('usage: hfc-oker-agent-bootstrap.mjs <designPath> <port>');
  process.exit(2);
}

process.env.HFC_WORKSPACE_DIR = process.env.HFC_WORKSPACE_DIR ?? designPath.replace(/[^/\\]+$/, '');
process.env.HFC_HTTP_HOST = '127.0.0.1';
process.env.HFC_HTTP_PORT = String(port);
process.env.HFC_LOG_LEVEL = 'error';

const config = loadConfig({ version: 'bootstrap', cliInitialFile: null });
setFontsDir(config.fontsDir);
const engine = new DocumentEngine({
  persistence: new JsonPersistence(),
  logger: createConsoleLogger('error'),
});
await engine.loadFromDisk({ absolutePath: designPath, save: false });
const started = await createHttpServer({
  config: { ...config, httpPort: port },
  engine,
  logger: createConsoleLogger('error'),
});
console.log(`ready port=${String(started.port)}`);

const shutdown = async () => {
  await started.close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
