export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface HeadlessFigmaRuntimeConfig {
  httpHost: string;
  httpPort: number;
  workspaceDir: string;
  initialFilePath: string | null;
  allowDebug: boolean;
  logLevel: LogLevel;
  screenshotTimeoutMs: number;
  /** Default Playwright `deviceScaleFactor` when `get_screenshot` omits it (Phase 2). */
  screenshotDefaultDeviceScaleFactor: number;
  /** Default screenshot background when tool omits `background` (Phase 2). */
  screenshotDefaultBackground: 'white' | 'transparent';
  version: string;
}
