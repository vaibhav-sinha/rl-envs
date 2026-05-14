export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface HeadlessFigmaRuntimeConfig {
  phase: 1 | 2 | 3 | 4 | 5;
  httpHost: string;
  httpPort: number;
  workspaceDir: string;
  initialFilePath: string | null;
  allowDebug: boolean;
  logLevel: LogLevel;
  screenshotTimeoutMs: number;
  version: string;
}
