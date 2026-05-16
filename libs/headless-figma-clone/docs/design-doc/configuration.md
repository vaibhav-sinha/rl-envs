# Configuration and environment

[← Design index](./index.md)

## Sources of configuration (precedence)

1. Environment variables (highest)
2. Optional JSON file `HFC_CONFIG_PATH` pointing to config file
3. Built-in defaults (lowest)

## Environment variables (normative)

| Variable | Type | Default | Phase | Meaning |
|----------|------|---------|-------|---------|
| `HFC_HTTP_HOST` | string | `127.0.0.1` | 1 | HTTP bind address (**Must** default loopback per NFR-SEC-002) |
| `HFC_HTTP_PORT` | int | `3847` | 1 | HTTP listen port |
| `HFC_WORKSPACE_DIR` | path | `~/.headless-figma-clone/workspace` | 1 | Default directory for `create_new_file` |
| `HFC_INITIAL_FILE` | path | *(empty)* | 1 | If set, load this JSON file at startup |
| `HFC_LOG_LEVEL` | enum | `info` | 1 | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` |
| `HFC_SCREENSHOT_TIMEOUT_MS` | int | `30000` | 1 | Playwright timeout for `get_screenshot` |
| `HFC_PLAYWRIGHT_BROWSER` | string | `chromium` | 1 | `chromium` only in Phase 1 |
| `HFC_SCREENSHOT_DEVICE_SCALE` | number | `1` | 2 | Default DPR for screenshots |
| `HFC_SCREENSHOT_BACKGROUND` | enum | `white` | 2 | `transparent` \| `white` — applies outside opaque layers |
| `HFC_UPLOAD_MAX_BYTES` | int | `10485760` | 3 | 10 MiB cap for `upload_assets` |

## Config file schema (optional, Phase 1 Should)

Path: user-provided JSON, merged after defaults.

```typescript
export interface HeadlessFigmaConfigFile {
  http?: { host?: string; port?: number };
  workspaceDir?: string;
  logLevel?: string;
  screenshot?: { timeoutMs?: number; defaultDeviceScale?: number; defaultBackground?: 'transparent' | 'white' };
  uploads?: { maxBytes?: number };
}
```

## CLI flags (normative)

```text
node dist/cli.js --transport http|stdio [--http-host HOST] [--http-port PORT] [--config PATH]
```

- `--transport stdio`: MCP over stdio **only**; **no** HTTP server (health checks = process liveness).

## Related documents

- [HTTP host](./http-host.md)
- [Observability](./observability.md)
