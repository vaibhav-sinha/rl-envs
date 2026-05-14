# headless-figma-clone

Phase 1 headless document service with an MCP server (HTTP or stdio).

## Requirements

- **Node.js** 20 or newer
- From this directory, run **`npm install`** then **`npm run build`** so `dist/` exists (the CLI entry is `dist/cli.js`).
- **`get_screenshot`** uses Playwright; tests run **`npm run pretest`** (or `npx playwright install chromium`) once per machine if you need screenshots.

## Run the CLI

All examples assume your shell’s current directory is `libs/headless-figma-clone` after a build.

### HTTP transport (default)

Listens for MCP over Streamable HTTP and serves a few HTTP routes.

```bash
node dist/cli.js --transport http
```

Bind host and port (these set `HFC_HTTP_HOST` / `HFC_HTTP_PORT` for the process):

```bash
node dist/cli.js --transport http --http-host 127.0.0.1 --http-port 3847
```

Enable debug HTTP routes without setting an environment variable:

```bash
node dist/cli.js --transport http --http-port 3847 --debug
```

Load a file at startup (absolute or relative path is passed through; resolve to an absolute path if needed):

```bash
node dist/cli.js --transport http --file "C:\path\to\design.hfc.json"
```

**npm** shortcut (same as `node dist/cli.js --transport http`):

```bash
npm start
```

If the package is linked or installed with the **`hfc`** bin:

```bash
hfc --transport http --http-port 3847
```

### Stdio transport

For MCP clients that spawn the process and speak over stdin/stdout:

```bash
node dist/cli.js --transport stdio
```

### CLI flags

| Flag | Values | Description |
|------|--------|-------------|
| `--transport` | `http` (default), `stdio` | MCP transport |
| `--http-host` | host string | HTTP listen host (HTTP only) |
| `--http-port` | port number | HTTP listen port (HTTP only) |
| `--file` | path | Initial `.hfc.json` to load after startup |
| `--debug` | — | Enables debug mode (`HFC_ALLOW_DEBUG=1`): `/debug/*` HTTP routes and live preview refresh (same as the env var) |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HFC_HTTP_HOST` | `127.0.0.1` | HTTP bind address |
| `HFC_HTTP_PORT` | `3847` | HTTP port (`0` = OS-assigned, useful in tests) |
| `HFC_INITIAL_FILE` | — | Path to load if `--file` is not set |
| `HFC_WORKSPACE_DIR` | `~/.headless-figma-clone/workspace` | Default workspace for new files |
| `HFC_LOG_LEVEL` | `info` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` |
| `HFC_SCREENSHOT_TIMEOUT_MS` | `30000` | Playwright timeout for screenshots |
| `HFC_ALLOW_DEBUG` | off | Set to `1` to enable `/debug/*` routes (see design docs). Same effect as **`--debug`** on the CLI. |

### HTTP endpoints (transport `http`)

Replace the host and port with your listen address (for example `http://127.0.0.1:3847` when using `--http-port 3847`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | JSON: `status`, `version`, `phase`. Always available. |
| `GET` | `/files` | JSON: workspace `.hfc.json` files with metadata; each entry includes **`setActiveUrl`** pointing at `/files/active` for that file. Always available. |
| `GET` | `/files/active?path=…` | Loads the given absolute path as the active document. Query **`path`** must be URL-encoded, resolve under **`HFC_WORKSPACE_DIR`**, and end with **`.hfc.json`**. JSON: `ok`, `fileKey`, `filePath`, `fileName`. Always available. |
| `POST` | `/mcp` | MCP Streamable HTTP (JSON-RPC bodies, `mcp-session-id` header after initialize). Always available. |
| `GET` | `/mcp` | Returns **405** with `Allow: POST` (MCP is POST-only). |

With **`HFC_ALLOW_DEBUG=1`** or the **`--debug`** CLI flag:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/debug/load-file` | JSON body `{ "path": "<absolute path>" }` — loads any path as the active file (not restricted to the workspace). |
| `GET` | `/debug/preview` | HTML snapshot of the first page of the active file (updates when the active document changes). |

Example base URL: `http://127.0.0.1:3847`

- Health: `http://127.0.0.1:3847/health`
- List files: `http://127.0.0.1:3847/files`
- Set active file (encode `path`): `http://127.0.0.1:3847/files/active?path=` + `encodeURIComponent("C:\\…\\design.hfc.json")`
- MCP: `http://127.0.0.1:3847/mcp` (POST)
- Debug load (POST JSON): `http://127.0.0.1:3847/debug/load-file`
- Debug preview: `http://127.0.0.1:3847/debug/preview`

Stop the server with **Ctrl+C** (SIGINT) or SIGTERM.
