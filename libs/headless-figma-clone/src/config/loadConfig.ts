import { homedir } from 'node:os';
import { join } from 'node:path';
import type { HeadlessFigmaRuntimeConfig, LogLevel } from './types.js';

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envString(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const LEVELS: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

function envLogLevel(name: string, fallback: LogLevel): LogLevel {
  const v = process.env[name]?.toLowerCase();
  if (!v) return fallback;
  return LEVELS.includes(v as LogLevel) ? (v as LogLevel) : fallback;
}

function envScreenshotBackground(): 'white' | 'transparent' {
  const v = process.env.HFC_SCREENSHOT_BACKGROUND?.trim().toLowerCase();
  if (v === 'white' || v === 'transparent') return v;
  return 'transparent';
}

export function loadConfig(params: {
  version: string;
  cliInitialFile?: string | null;
}): HeadlessFigmaRuntimeConfig {
  const initialFromEnv = process.env.HFC_INITIAL_FILE?.trim();
  const initialFilePath =
    params.cliInitialFile && params.cliInitialFile.trim() !== ''
      ? params.cliInitialFile.trim()
      : initialFromEnv && initialFromEnv !== ''
        ? initialFromEnv
        : null;

  return {
    httpHost: envString('HFC_HTTP_HOST', '127.0.0.1'),
    httpPort: envInt('HFC_HTTP_PORT', 3847),
    workspaceDir: envString('HFC_WORKSPACE_DIR', join(homedir(), '.headless-figma-clone', 'workspace')),
    initialFilePath,
    logLevel: envLogLevel('HFC_LOG_LEVEL', 'info'),
    screenshotTimeoutMs: envInt('HFC_SCREENSHOT_TIMEOUT_MS', 30_000),
    screenshotDefaultDeviceScaleFactor: envInt('HFC_SCREENSHOT_DPR', 1),
    screenshotDefaultBackground: envScreenshotBackground(),
    version: params.version,
  };
}
