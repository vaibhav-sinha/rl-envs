# Overview and normative decisions

[← Design index](./index.md) · [PRD vision](../prd/vision-and-scope.md)

## Product summary

A **single-process** Node.js / TypeScript service that:

- Maintains an authoritative **JSON document graph** for a Figma Design–like file.
- Persists that graph to disk on every successful mutation (**atomic write**).
- Exposes **MCP tools** aligned with Figma MCP naming (excluding Code Connect and other out-of-scope tools).
- Renders subtrees by compiling to **HTML/CSS/(inline SVG in Phase 4+)** and captures **PNG** screenshots via **Playwright**.

## Normative exclusions

The engine **must reject** (at validation or tool boundary) any payload that implies:

- Dev Mode, prototyping, `VideoPaint`, remote libraries, `EMBED`, `LINK_UNFURL`, `pluginData` / `sharedPluginData` / `relaunchData`.

See [PRD vision](../prd/vision-and-scope.md) NG6–NG11.

## Fixed implementation choices (no engineer discretion)

These are **binding** for Phase 1. They resolve PRD ambiguities.

### 1. MCP transport (Phase 1)

| CLI `--transport` | HTTP server (`/health`, `/mcp`) | MCP binding |
|-------------------|----------------------------------|-------------|
| `http` (default) | **Yes** | Streamable HTTP on `POST /mcp` |
| `stdio` | **No** | stdio transport only |

- **CI:** run automated integration tests on **`http`** mode (covers FR-PLAT-003). Add a lightweight **`stdio` smoke** test that spawns the process and verifies it accepts one MCP handshake (exact harness depends on SDK test utilities).

**Rationale:** a single OS process should not host two conflicting Streamable HTTP servers; stdio clients typically do not need localhost HTTP.

### 2. `get_metadata` wire format

- **Format:** **JSON only** (not XML), UTF-8.
- **Version field:** every response includes `metadataFormatVersion: 1` (integer).
- **Child order semantics:** `children[i]` is drawn **before** `children[j]` for `i < j`, so **greater index appears visually on top** among siblings. The HTML compiler **must** assign monotonically increasing `z-index` (or DOM order with `position` stacking) consistent with this rule. Metadata includes once at root: `"childStacking": "later-children-on-top"`.

### 3. Node ID generation

- **Pattern:** string matching `^I\d+$` (e.g. `I1`, `I2`) — internal-only, stable within a file.
- **Persistence:** store `nextInternalId: number` in file envelope; increment on each new node.
- **MCP exposure:** all tools use this string as `nodeId`.
- **Rationale:** avoids colon formats that clients confuse with Figma URLs; still opaque and stable.

### 4. Active file context (Phase 1–4)

- Exactly **one** `ActiveFile` at a time: `activeFilePath: string | null`, `document: FileEnvelope | null`.
- `create_new_file` sets the active file.

**Opening an existing file (Phase 1):**

| Mechanism | Required | Purpose |
|-----------|----------|---------|
| `HFC_INITIAL_FILE` | Must | Absolute path to JSON; engine loads before accepting MCP traffic. |
| CLI `--file <path>` | Must | Same as env; CLI wins if both set (CLI overrides env). |
| `GET /files/active?path=…` | Must | Loads a workspace `.hfc.json` as the active file; optional `redirect=/preview`. |
| MCP tool `open_file` | Must (Phase 2) | First-class tool for agents; see [Implementation plan](./implementation-plan-phases.md). |

Internal API (shared by HTTP debug and future MCP):

```typescript
async function openFileFromDisk(params: { absolutePath: string }): Promise<{ fileKey: string; filePath: string }>;
```

### 5. Default workspace directory

- If `create_new_file` omits `directory`, write to `HFC_WORKSPACE_DIR` or, if unset, `path.join(os.homedir(), '.headless-figma-clone', 'workspace')` (Windows/macOS/Linux).

### 6. `fileKey`

- **Equals** the canonical absolute file path string (normalized) in Phase 1–2 for simplicity; **or** a ULID stored in envelope `fileKey` field. **Binding:** store **`fileKey: string`** as ULID in envelope at file creation; return it from tools; **never** reuse for different paths.

### 7. Screenshot output over MCP

- **Primary:** return structured JSON `{ mimeType: "image/png", dataBase64: string, width: number, height: number }` for tool `get_screenshot`.
- **Rationale:** maximizes client compatibility vs opaque binary parts.

### 8. `get_design_context` output

- Always return `{ html: string, css: string, warnings: string[], assets?: { id: string, mimeType: string, dataBase64: string }[] }`.
- `html` is a **full HTML document** string (`<!DOCTYPE html><html>...`) so Playwright can load via `page.setContent(html, { waitUntil: 'load' })` without a file server when inlined; **or** use `data:` URL—**binding:** **full HTML document** with embedded `<style>` containing `css` for Phase 1.

### 9. Determinism

- JSON serialization for save: **sorted object keys** optional; **must** preserve `children` array order exactly.
- Compiler: stable class names `hfc-node-{nodeId}` where `nodeId` is alphanumeric-safe (`I1` → `hfc-node-I1`).

### 10. Font stack (screenshots)

- **Binding:** embed CSS `@font-face` is **not** required in Phase 1; use `font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";`
- Tests use **pixelmatch** threshold **≤ 0.1%** differing pixels OR compare PNG SHA256 only in CI with pinned Chromium (documented).

## Related documents

- [Configuration](./configuration.md)
- [MCP layer](./mcp-layer.md)
- [Implementation plan](./implementation-plan-phases.md)
