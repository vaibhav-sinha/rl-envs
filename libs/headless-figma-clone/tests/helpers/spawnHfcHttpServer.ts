import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface SpawnedHfcHttp {
  port: number;
  baseUrl: string;
  child: ChildProcess;
  stderr: () => string;
  close: () => Promise<void>;
}

/** Pick a free TCP port on 127.0.0.1. */
export function reserveLocalPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
    s.on('error', reject);
  });
}

export interface SpawnHfcHttpOptions {
  port: number;
  /** Passed as `--file` and HFC_INITIAL_FILE */
  initialFile?: string;
  workspaceDir: string;
  /** Node heap cap for the HFC process (e.g. 512 for container-like limits). */
  maxOldSpaceSizeMb?: number;
  logLevel?: string;
  extraEnv?: Record<string, string>;
}

/** Spawn `dist/cli.js` HTTP server and wait until `/health` responds. */
export async function spawnHfcHttpServer(opts: SpawnHfcHttpOptions): Promise<SpawnedHfcHttp> {
  const cliPath = join(pkgRoot, 'dist', 'cli.js');
  const nodeArgs: string[] = [];
  if (opts.maxOldSpaceSizeMb !== undefined) {
    nodeArgs.push(`--max-old-space-size=${String(opts.maxOldSpaceSizeMb)}`);
  }
  nodeArgs.push(
    cliPath,
    '--transport',
    'http',
    '--http-host',
    '127.0.0.1',
    '--http-port',
    String(opts.port)
  );
  if (opts.initialFile) {
    nodeArgs.push('--file', opts.initialFile);
  }

  const stderrChunks: string[] = [];
  const child = spawn(process.execPath, nodeArgs, {
    cwd: pkgRoot,
    env: {
      ...process.env,
      HFC_WORKSPACE_DIR: opts.workspaceDir,
      HFC_HTTP_HOST: '127.0.0.1',
      HFC_HTTP_PORT: String(opts.port),
      HFC_LOG_LEVEL: opts.logLevel ?? 'error',
      ...(opts.initialFile ? { HFC_INITIAL_FILE: opts.initialFile } : {}),
      ...opts.extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr?.on('data', (buf: Buffer) => {
    stderrChunks.push(buf.toString('utf8'));
  });

  const baseUrl = `http://127.0.0.1:${String(opts.port)}`;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `HFC exited before ready (code ${String(child.exitCode)}): ${stderrChunks.join('').slice(-4000)}`
      );
    }
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (Date.now() >= deadline) {
    child.kill();
    throw new Error(`HFC health check timed out: ${stderrChunks.join('').slice(-4000)}`);
  }

  return {
    port: opts.port,
    baseUrl,
    child,
    stderr: () => stderrChunks.join(''),
    close: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 10_000);
        child.once('exit', () => {
          clearTimeout(t);
          resolve();
        });
      });
    },
  };
}

export interface SpawnHfcBootstrapOptions {
  port: number;
  designPath: string;
  maxOldSpaceSizeMb?: number;
  extraEnv?: Record<string, string>;
}

/** Spawn preloaded HFC (`scripts/hfc-oker-agent-bootstrap.mjs`) capped at `maxOldSpaceSizeMb`. */
export async function spawnHfcBootstrapServer(opts: SpawnHfcBootstrapOptions): Promise<SpawnedHfcHttp> {
  const bootstrapPath = join(pkgRoot, 'scripts', 'hfc-oker-agent-bootstrap.mjs');
  const nodeArgs: string[] = [];
  if (opts.maxOldSpaceSizeMb !== undefined) {
    nodeArgs.push(`--max-old-space-size=${String(opts.maxOldSpaceSizeMb)}`);
  }
  nodeArgs.push(bootstrapPath, opts.designPath, String(opts.port));

  const stderrChunks: string[] = [];
  const stdoutChunks: string[] = [];
  const child = spawn(process.execPath, nodeArgs, {
    cwd: pkgRoot,
    env: { ...process.env, HFC_LOG_LEVEL: 'error', ...opts.extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (buf: Buffer) => stdoutChunks.push(buf.toString('utf8')));
  child.stderr?.on('data', (buf: Buffer) => stderrChunks.push(buf.toString('utf8')));

  const baseUrl = `http://127.0.0.1:${String(opts.port)}`;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `bootstrap exited (code ${String(child.exitCode)}): ${(stderrChunks.join('') + stdoutChunks.join('')).slice(-4000)}`
      );
    }
    if (stdoutChunks.join('').includes('ready port=')) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!stdoutChunks.join('').includes('ready port=')) {
    child.kill();
    throw new Error(`bootstrap timed out: ${stderrChunks.join('').slice(-4000)}`);
  }

  return {
    port: opts.port,
    baseUrl,
    child,
    stderr: () => stderrChunks.join(''),
    close: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 10_000);
        child.once('exit', () => {
          clearTimeout(t);
          resolve();
        });
      });
    },
  };
}
