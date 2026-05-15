export interface LocalFigmaMcpConfig {
  version: string;
  httpHost: string;
  httpPort: number;
  toolTimeoutMs: number;
  screenshotAssetTtlMs: number;
}

export function loadConfig(version: string): LocalFigmaMcpConfig {
  const httpHost = process.env.LFM_HTTP_HOST ?? '127.0.0.1';
  const httpPort = Number.parseInt(process.env.LFM_HTTP_PORT ?? '3855', 10);
  const toolTimeoutMs = Number.parseInt(process.env.LFM_TOOL_TIMEOUT_MS ?? '120000', 10);
  const screenshotAssetTtlMs = Number.parseInt(process.env.LFM_SCREENSHOT_TTL_MS ?? '300000', 10);

  return {
    version,
    httpHost,
    httpPort: Number.isFinite(httpPort) ? httpPort : 3855,
    toolTimeoutMs: Number.isFinite(toolTimeoutMs) ? toolTimeoutMs : 120_000,
    screenshotAssetTtlMs: Number.isFinite(screenshotAssetTtlMs) ? screenshotAssetTtlMs : 300_000,
  };
}

export function parseArgv(argv: string[]): { httpHost?: string; httpPort?: number } {
  let httpHost: string | undefined;
  let httpPort: number | undefined;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--http-host' && argv[i + 1]) {
      httpHost = argv[++i]!;
      continue;
    }
    if (a === '--http-port' && argv[i + 1]) {
      httpPort = Number.parseInt(argv[++i]!, 10);
    }
  }
  if (httpHost) process.env.LFM_HTTP_HOST = httpHost;
  if (httpPort !== undefined && Number.isFinite(httpPort)) process.env.LFM_HTTP_PORT = String(httpPort);
  return { httpHost, httpPort };
}
