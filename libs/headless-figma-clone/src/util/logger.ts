import type { LogLevel } from '../config/types.js';

export interface Logger {
  child(meta: Record<string, unknown>): Logger;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
  debug(msg: string, extra?: Record<string, unknown>): void;
}

const ORDER: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

function shouldLog(level: LogLevel, min: LogLevel): boolean {
  return ORDER.indexOf(level) <= ORDER.indexOf(min);
}

export function createConsoleLogger(
  level: LogLevel,
  base: Record<string, unknown> = {}
): Logger {
  const line = (lvl: string, msg: string, extra?: Record<string, unknown>) => {
    const payload = { ...base, ...extra, msg: `[hfc] ${msg}` };
    // eslint-disable-next-line no-console
    console[lvl === 'error' ? 'error' : lvl === 'warn' ? 'warn' : 'log'](JSON.stringify(payload));
  };

  return {
    child(meta: Record<string, unknown>): Logger {
      return createConsoleLogger(level, { ...base, ...meta });
    },
    info(msg: string, extra?: Record<string, unknown>) {
      if (shouldLog('info', level)) line('info', msg, extra);
    },
    warn(msg: string, extra?: Record<string, unknown>) {
      if (shouldLog('warn', level)) line('warn', msg, extra);
    },
    error(msg: string, extra?: Record<string, unknown>) {
      if (shouldLog('error', level)) line('error', msg, extra);
    },
    debug(msg: string, extra?: Record<string, unknown>) {
      if (shouldLog('debug', level)) line('debug', msg, extra);
    },
  };
}
