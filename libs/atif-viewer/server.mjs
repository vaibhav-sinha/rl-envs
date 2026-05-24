#!/usr/bin/env node
import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VIEWER_DIR = __dirname;

function parseArgs(argv) {
  let port = 4174;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' && argv[i + 1]) {
      port = Number.parseInt(argv[++i], 10);
    }
  }
  return { port };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * @param {string} baseDir
 * @param {string} urlPath
 */
function safePath(baseDir, urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const joined = normalize(join(baseDir, decoded.replace(/^\//, '')));
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

const { port } = parseArgs(process.argv);

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

  const filePath = safePath(VIEWER_DIR, pathname);
  if (filePath && existsSync(filePath)) {
    sendFile(res, filePath);
    return;
  }

  sendError(res, 404, 'Not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ATIF viewer: http://127.0.0.1:${String(port)}/`);
});
