# headless-figma-clone

Local-first **Figma Design–shaped** document service: persisted **`.hfc.json`** trees, **MCP** tools (`create_new_file`, `open_file`, `use_figma`, `get_metadata`, `get_design_context`, `get_screenshot`, …), and a **Plugin API–style** sandbox for `use_figma` **`code`** so agents can reuse familiar patterns without Figma Desktop or cloud files.

**Delivery roadmap:** [Nine-phase implementation and testing plan](./docs/design-doc/implementation-plan-phases.md) (Phases 1–6: core pipeline; Phase 6: script ↔ engine parity; **Phases 7–9**: broader Plugin API parity—traversal, layout sizing, fonts/images, variables, styles, graph-native components).

## What we intentionally do **not** support

This clone targets **automation and compile-to-HTML/CSS/screenshot** workflows, not a full Figma product. The following are **out of scope by design** (unless the PRD explicitly changes). Many align with [Vision and scope — Non-goals](./docs/prd/vision-and-scope.md):

| Category | Excluded (examples) |
|----------|---------------------|
| **Product surface** | Interactive Figma-like editor UI; WebGL/canvas editor renderer matching Figma’s engine; multiplayer / live cursors / comments. |
| **Figma org & cloud** | Figma **REST API**, org admin, cloud file sync, **published team libraries**, **`importComponentByKeyAsync` / `importStyleByKeyAsync` / `importVariableByKeyAsync`** (remote keys require Figma). |
| **Other Figma editors** | **FigJam**, **Slides**, **Buzz**-only nodes and tools (`createSticky`, `createConnector`, slide grid APIs, `timer`, …). This repo is **Figma Design–centric** per PRD. |
| **Dev Mode & plugins host** | **Dev Mode** plugins (`codegen`, `vscode`, `devResources`, Inspect-only APIs), **`showUI` / `figma.ui`**, plugin parameters mode, payments, `currentUser` / `activeUsers` as real collaboration identities. |
| **Prototyping & motion** | **Prototyping** (`reactions`, transitions, overlays, flows). |
| **Media & embeds** | **Video** fills/nodes; **`EMBED`** and **`LINK_UNFURL`** node types. |
| **Plugin persistence on nodes** | **`pluginData`**, **`sharedPluginData`**, **`relaunchData`**. |
| **Code Connect** | Code Connect MCP tools and mapping workflows (`add_code_connect_map`, …). |
| **Network from sandbox (default)** | **`fetch`** and **`createImageAsync(url)`** are **off** by default; Phases 7+ allow **opt-in**, allowlisted, SSRF-hardened access only—never “open internet” from plugin code by default. |
| **Pixel-perfect Figma** | **Byte-identical** rendering vs Figma; proprietary blend/vector/boolean internals. We document **simplifications** (e.g. some boolean ops) where the compiler approximates. |

If you need a capability that looks similar to an excluded API, check **`implementation-plan-phases.md`** for the **Phases 7–9** parity track vs the **intentional exclusion** list above.

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

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HFC_HTTP_HOST` | `127.0.0.1` | HTTP bind address |
| `HFC_HTTP_PORT` | `3847` | HTTP port (`0` = OS-assigned, useful in tests) |
| `HFC_INITIAL_FILE` | — | Path to load if `--file` is not set |
| `HFC_WORKSPACE_DIR` | `~/.headless-figma-clone/workspace` | Default workspace for new files |
| `HFC_LOG_LEVEL` | `info` | `fatal` \| `error` \| `warn` \| `info` \| `debug` \| `trace` |
| `HFC_SCREENSHOT_TIMEOUT_MS` | `30000` | Playwright timeout for screenshots |

### HTTP endpoints (transport `http`)

Replace the host and port with your listen address (for example `http://127.0.0.1:3847` when using `--http-port 3847`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | JSON: `status`, `version`, `exportEndpoint`, `previewEndpoint`. Always available. |
| `POST` | `/import/hfc` | JSON body `{ "hfcFileName", "snapshot" }` — converts snapshot to envelope + inline assets (**no disk write**). |
| `POST` | `/export/hfc` | Same body; returns import response by default. Use `?save=true` to persist `{slug}.hfc.json` under **`HFC_WORKSPACE_DIR`** (legacy). |
| `GET` | `/files` | HTML file browser listing workspace `.hfc.json` files. Each row has a **View** link that activates the file and opens the preview. Always available. |
| `GET` | `/files/active?path=…` | Loads the given absolute path as the active document. Query **`path`** must be URL-encoded, resolve under **`HFC_WORKSPACE_DIR`**, and end with **`.hfc.json`**. Returns JSON (`ok`, `fileKey`, `filePath`, `fileName`) unless **`redirect`** is set (e.g. `redirect=/preview` → **302** to preview). Always available. |
| `GET` | `/preview?pageId=…` | HTML design preview of the active file with a floating page selector toolbar. Optional **`pageId`** selects which page to render. Updates when the active document changes. Always available. |
| `POST` | `/mcp` | MCP Streamable HTTP (JSON-RPC bodies, `mcp-session-id` header after initialize). Always available. |
| `GET` | `/mcp` | Returns **405** with `Allow: POST` (MCP is POST-only). |

Example base URL: `http://127.0.0.1:3847`

- Health: `http://127.0.0.1:3847/health`
- Figma export import: `POST http://127.0.0.1:3847/export/hfc` (from the Local Figma MCP plugin **Export File** action; requires this server to be running)
- File browser: `http://127.0.0.1:3847/files`
- Set active file (encode `path`): `http://127.0.0.1:3847/files/active?path=` + `encodeURIComponent("C:\\…\\design.hfc.json")`
- Preview: `http://127.0.0.1:3847/preview`
- MCP: `http://127.0.0.1:3847/mcp` (POST)

Stop the server with **Ctrl+C** (SIGINT) or SIGTERM.

## Figma plugin import → compile

The **local-figma-mcp** plugin exports a JSON snapshot (`POST /export/hfc` or **Export File** in Desktop). The importer builds a `FileEnvelope` that `DesignCompiler` turns into HTML/CSS for `/preview` and `get_design_context`.

### Coordinate contract

- HFC `x` / `y` on scene nodes are **parent-relative** (same as Figma `node.x` / `node.y`).
- Snapshots include **`x`, `y`, `width`, `height`** (preferred) and **`absoluteBoundingBox`** (page space, used as fallback).
- Nested **`left` / `top`** in compiled CSS are relative to each positioned parent (frame, group wrapper, instance shell).

### Instance overrides at compile time

When rendering **`INSTANCE`** nodes, the compiler clones the **COMPONENT** master and applies overrides in this order:

1. Formal **`overrides`** map on the instance (when present in `.hfc.json`)
2. **`componentProperties`** (BOOLEAN visibility, TEXT characters, VARIANT selection, INSTANCE_SWAP)
3. Instance-root appearance (fills/strokes cleared on the shell, etc.)
4. **`instance.children`** — detached subtree from plugin export (**canonical path** for per-layer diffs)

Plugin exports usually omit the `overrides` map and store customized layers under **`instance.children`**. The compiler merges those layers onto the cloned master by matching **`sourceFigmaId`** (strip the instance prefix, e.g. `I2176:169422;24:6583` → `24:6583`). Child geometry is **not** scaled to instance bounds; only the root frame is resized to the instance width/height.

### Supported vs unsupported on import

| Supported (standard UI) | Not imported (by design) |
|-------------------------|---------------------------|
| `FRAME`, `TEXT`, shapes, `VECTOR`, `BOOLEAN_OPERATION`, `GROUP`, `TRANSFORM_GROUP`, `SECTION`, `COMPONENT`, `INSTANCE`, `SLICE` | FigJam nodes (`CONNECTOR`, `STICKY`, widgets, …), native `TABLE` |
| Auto-layout, constraints, grid frames (columns guides), pattern fills, styled text segments, component instances | `vectorNetwork` (plugin WASM), full `relativeTransform` skew/matrix |
| Variables, bound fields, paint/effect/text/grid styles (subset) | Figma `layoutGrids` GRID pattern rows (engine rejects) |

Set `HFC_IMPORT_VERBOSE=1` to log skipped nodes and unmapped snapshot property keys.

## Verification (Figma vs clone screenshots)

Visual parity scenarios live under `verification/`. Each scenario is a subdirectory of `verification/scenarios/` with:

| File | Purpose |
|------|---------|
| `script.js` | JavaScript body for `use_figma` `{ code }` (same script sent to real Figma MCP and the clone) |
| `description.txt` | What is tested and expected output |
| `figma.png` | Screenshot from Figma (written by your runner) |
| `clone.png` | Screenshot from the clone (written by your runner) |

`verification/manifest.json` lists all 110 scenarios in order (foundational 01–50, advanced 51–110).

### View results (slideshow)

```bash
npm run verify:view:dev
```

Or after build:

```bash
npm run build
npm run verify:view
```

Opens a local viewer at `http://127.0.0.1:4173/` with side-by-side **Figma | Clone** images. Use **Previous** / **Next** or arrow keys. Optional flags: `--port 4173`, `--dir <path-to-verification>`.

```bash
hfc verify-view --verify-port 4173
```

Regenerate scenario files from definitions:

```bash
node verification/scripts/generate-scenarios.mjs
```

### Capture screenshots (Figma + clone MCP)

Requires both MCP servers running (defaults match a typical Cursor `mcp.json`):

| Server | Default URL |
|--------|-------------|
| Figma (local-figma-mcp + Desktop plugin) | `http://127.0.0.1:3855` |
| Clone (headless-figma-clone) | `http://127.0.0.1:3847` |

Figma: open a design file in Desktop and run the **Local Figma MCP** plugin (connected). Tool `fileKey` args are ignored — the open file is used. Clone: `npm start` in this package.

```bash
npm run build
npm run verify:run
```

Or without building:

```bash
npm run verify:run:dev
```

Options: `--figma-url`, `--clone-url`, `--from N`, `--to N`, `--only figma|clone|both`, `--fail-fast`.

Scenarios **121–123** load real photos from Wikimedia Commons via `createImageAsync`. For the clone server, enable network fetches:

```bash
npm start -- --allow-network
```

Or set `HFC_ALLOW_NETWORK=1` in the environment before starting the server.

Writes `figma.png` and `clone.png` into each `verification/scenarios/<id>/` directory (via `use_figma` then `get_screenshot` image content blocks).
