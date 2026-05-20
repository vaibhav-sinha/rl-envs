# local-figma-mcp

Local MCP server that exposes five Figma MCP tools and proxies execution to a **Figma Desktop plugin** over WebSocket. The plugin implements each tool with the **Figma Plugin API** only (no dependency on Figma’s native MCP server).

## Tools

| Tool | Description |
|------|-------------|
| `get_metadata` | Sparse XML outline of selection or page structure |
| `get_screenshot` | PNG screenshot of a node (inline MCP `image` content, like headless-figma-clone) |
| `get_variable_defs` | Variables and styles used in a selection |
| `search_design_system` | Search local file + enabled library variables/styles/components |
| `use_figma` | Run Plugin API JavaScript (`code` + `description`) |

Tool descriptions match [tools-and-prompts.md](../headless-figma-clone/docs/figma-plugin-api/docs/figma-mcp-server/tools-and-prompts.md). Input shapes align with official Figma MCP JSON schemas.

## Quick start

### 1. Build and run the server

```bash
cd libs/local-figma-mcp
npm install
npm run build:all
npm start
```

Default endpoints:

- MCP: `http://127.0.0.1:3855/mcp`
- Plugin WebSocket: `ws://127.0.0.1:3855/plugin`
- Health: `http://127.0.0.1:3855/health`

Override port: `LFM_HTTP_PORT=3856 npm start` or `node dist/index.js --http-port 3856`

### 2. Install the Figma plugin

1. Open **Figma Desktop**.
2. **Plugins → Development → Import plugin from manifest…**
3. Select `libs/local-figma-mcp/plugin/manifest.json`.
4. Run **Local Figma MCP** on an open design file.
5. Confirm the plugin UI shows **Connected** and your file key.

### 3. Configure your MCP client (Cursor)

```json
{
  "mcpServers": {
    "local-figma": {
      "url": "http://127.0.0.1:3855/mcp"
    }
  }
}
```

Do not enable Figma’s built-in desktop MCP on the same port if you use the default `3855` for this server (official desktop MCP uses `3845`).

## Architecture

```
MCP client → HTTP /mcp → local-figma-mcp (Node)
                              ↓ WebSocket /plugin
                         Figma plugin (Desktop)
                              ↓ Plugin API
                         Open Figma file
```

## Manual verification checklist

- [ ] `curl http://127.0.0.1:3855/health` shows `pluginConnected: true` with plugin running.
- [ ] `use_figma`: create a frame with a short script; verify on canvas.
- [ ] `get_metadata`: returns XML for current selection or page list when `nodeId` omitted.
- [ ] `get_screenshot`: returns inline PNG image content with width/height metadata.
- [ ] `get_variable_defs`: returns JSON map for a frame using variables.
- [ ] `search_design_system`: query `button` returns local components/styles.

## Limitations

- **One plugin connection** at a time (last connection wins).
- **`search_design_system`**: library component search is best-effort via local component nodes; remote library parity may be weaker than official remote MCP.
- **`use_figma`**: requires edit access; read-only tools work in more contexts.
- Plugin `devAllowedDomains` must use `localhost` (not `127.0.0.1`) per Figma manifest validation. Update port in `plugin/manifest.json` and `plugin/src/ui.html` if you change `LFM_HTTP_PORT`.
- **`fileKey` in tool args is ignored** — all tools run against whichever file is open in Figma Desktop when the plugin is running.

## Task Builder UI

The plugin UI has three tabs: **Connection** (MCP logs), **Export** (standalone HFC export via Task Builder), and **Task Builder** (wizard for Harbor `figma-design` tasks).

### Streaming export (OOM-safe)

Large files are exported via **NDJSON streaming** to Task Builder (not a single giant JSON blob in the Figma plugin):

1. Plugin UI creates `POST /export/stream/session` on Task Builder (`3856`).
2. Plugin main thread yields NDJSON lines incrementally (protocol v3: no full in-memory tree); tree enter/exit lines are batched (128 per request). Icon tags use `node_props` parts; raster images stream as they complete (8 concurrent `getBytesAsync`). UI relays to Task Builder with ack backpressure.
3. Task Builder assembles each part on append and spools audit lines under `envs/figma-design/task-drafts/.export-sessions/{exportId}/`.
4. `POST .../finish` finalizes the snapshot, imports via HFC using on-disk asset files (no base64 in the HFC request body), and writes `design.hfc.json`.

Progress phases: **meta → serialize → icons → images → upload**. Requires Task Builder and HFC running.

### Services required

```bash
# HFC — snapshot import API
cd libs/headless-figma-clone && npm run build && npm run start

# Task Builder — drafts + finalize
cd libs/figma-task-builder && npm install && npm run dev

# Rebuild plugin after UI changes
cd libs/local-figma-mcp && npm run build:plugin
```

- Task Builder: `http://127.0.0.1:3856`
- Drafts: `envs/figma-design/task-drafts/`
- Finalized tasks: `envs/figma-design/tasks/`

See [libs/figma-task-builder/README.md](../figma-task-builder/README.md).

## Development

```bash
npm run typecheck
npm test
npm run build:plugin   # Vite UI + esbuild main thread
```
