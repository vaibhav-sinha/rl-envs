#!/usr/bin/env node
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWER_DIR = __dirname;
const DEFAULT_VERIFY_DIR = resolve(__dirname, '..');

function parseArgs(argv) {
  let port = 4173;
  let verifyDir = process.env.HFC_VERIFY_DIR ?? DEFAULT_VERIFY_DIR;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' && argv[i + 1]) {
      port = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (a === '--dir' && argv[i + 1]) {
      verifyDir = resolve(argv[++i]);
      continue;
    }
    if (a === '--verify-port' && argv[i + 1]) {
      port = Number.parseInt(argv[++i], 10);
      continue;
    }
    if (a === '--verify-dir' && argv[i + 1]) {
      verifyDir = resolve(argv[++i]);
      continue;
    }
  }
  return { port, verifyDir: resolve(verifyDir) };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * @param {string} baseDir
 * @param {string} urlPath
 */
function safePath(baseDir, urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const joined = normalize(join(baseDir, decoded));
  if (!joined.startsWith(normalize(baseDir))) return null;
  return joined;
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {number} code
 * @param {string} msg
 */
function sendError(res, code, msg) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(msg);
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} filePath
 */
function sendFile(res, filePath) {
  if (!existsSync(filePath)) {
    sendError(res, 404, 'Not found');
    return;
  }
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

const { port, verifyDir } = parseArgs(process.argv);
const scenariosDir = join(verifyDir, 'scenarios');
const manifestPath = join(verifyDir, 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error(`manifest.json not found at ${manifestPath}`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    sendFile(res, join(VIEWER_DIR, 'index.html'));
    return;
  }

  if (pathname === '/styles.css') {
    sendFile(res, join(VIEWER_DIR, 'styles.css'));
    return;
  }

  if (pathname === '/app.js') {
    sendFile(res, join(VIEWER_DIR, 'app.js'));
    return;
  }

  if (pathname === '/api/manifest') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(readFileSync(manifestPath, 'utf8'));
    return;
  }

  const descMatch = /^\/api\/scenarios\/([^/]+)\/description$/.exec(pathname);
  if (descMatch) {
    const id = decodeURIComponent(descMatch[1]);
    const filePath = join(scenariosDir, id, 'description.txt');
    sendFile(res, filePath);
    return;
  }

  const imgMatch = /^\/scenarios\/([^/]+)\/(figma|clone)\.png$/.exec(pathname);
  if (imgMatch) {
    const id = decodeURIComponent(imgMatch[1]);
    const side = imgMatch[2];
    const filePath = join(scenariosDir, id, `${side}.png`);
    sendFile(res, filePath);
    return;
  }

  sendError(res, 404, 'Not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Verification viewer: http://127.0.0.1:${String(port)}/`);
  console.log(`Scenarios dir: ${scenariosDir}`);
});
