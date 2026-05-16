import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/loadConfig.js';

const saved: Record<string, string | undefined> = {};

function setEnv(key: string, value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('loadConfig', () => {
  it('uses defaults when env vars are unset', () => {
    setEnv('HFC_HTTP_PORT', undefined);
    setEnv('HFC_LOG_LEVEL', undefined);
    const cfg = loadConfig({ version: '9.9.9', cliInitialFile: null });
    expect(cfg.httpPort).toBe(3847);
    expect(cfg.logLevel).toBe('info');
    expect(cfg.version).toBe('9.9.9');
  });

  it('reads env overrides and prefers cli initial file', () => {
    setEnv('HFC_HTTP_PORT', '9999');
    setEnv('HFC_LOG_LEVEL', 'debug');
    setEnv('HFC_INITIAL_FILE', '/env/file.hfc.json');
    const cfg = loadConfig({ version: '1.0.0', cliInitialFile: '/cli/file.hfc.json' });
    expect(cfg.httpPort).toBe(9999);
    expect(cfg.logLevel).toBe('debug');
    expect(cfg.initialFilePath).toBe('/cli/file.hfc.json');
  });
});
