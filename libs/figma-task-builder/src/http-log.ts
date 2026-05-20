import type { IncomingMessage, ServerResponse } from 'node:http';

/** Collapse UUIDs so export stream logs are readable in volume. */
export function normalizeHttpPath(pathname: string): string {
  return pathname
    .replace(
      /\/export\/stream\/[a-f0-9-]{36}\/part$/i,
      '/export/stream/:exportId/part'
    )
    .replace(
      /\/export\/stream\/[a-f0-9-]{36}\/finish$/i,
      '/export/stream/:exportId/finish'
    )
    .replace(
      /\/export\/stream\/[a-f0-9-]{36}\/replay-finish$/i,
      '/export/stream/:exportId/replay-finish'
    )
    .replace(/\/tasks\/[^/]+/g, (m) => {
      if (m === '/tasks') return m;
      const rest = m.slice('/tasks/'.length);
      if (!rest.includes('/')) return `/tasks/:taskId`;
      return `/tasks/:taskId${m.slice('/tasks/'.length + rest.indexOf('/'))}`;
    });
}

export interface HttpRequestLogMeta {
  /** NDJSON lines appended (stream /part). */
  lineCount?: number;
  /** Stream part sequence number. */
  seq?: number;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

function parseContentLength(req: IncomingMessage): number | undefined {
  const raw = req.headers['content-length'];
  if (!raw) return undefined;
  const n = Number.parseInt(Array.isArray(raw) ? raw[0]! : raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function attachHttpRequestLogging(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): { setMeta: (meta: HttpRequestLogMeta) => void } {
  const started = performance.now();
  const method = req.method ?? 'GET';
  const path = normalizeHttpPath(pathname);
  const contentLength = parseContentLength(req);
  let meta: HttpRequestLogMeta = {};

  const logOnce = (): void => {
    res.off('finish', logOnce);
    res.off('close', logOnce);
    const ms = Math.round(performance.now() - started);
    const status = res.statusCode || 0;
    const parts: string[] = [
      '[http]',
      method,
      path,
      String(status),
      `${ms}ms`,
    ];
    if (contentLength !== undefined) parts.push(formatBytes(contentLength));
    if (meta.lineCount !== undefined) parts.push(`${meta.lineCount} lines`);
    if (meta.seq !== undefined) parts.push(`seq ${meta.seq}`);
    if (status >= 500) parts.push('ERROR');
    console.log(parts.join(' '));
  };

  res.on('finish', logOnce);
  res.on('close', logOnce);

  return {
    setMeta(next: HttpRequestLogMeta): void {
      meta = { ...meta, ...next };
    },
  };
}
