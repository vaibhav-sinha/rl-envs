# MCP tools specification

[← PRD index](./index.md)

This document defines the **in-scope** MCP tools for the headless clone, derived from [Project.md](../Project.md) and Figma’s reference list in [tools-and-prompts.md](../figma-plugin-api/docs/figma-mcp-server/tools-and-prompts.md). **Code Connect** tools are excluded.

**Plugin API exclusions** (no MCP emulation required for these domains) are fixed in [vision and scope](./vision-and-scope.md): **Dev Mode**, **prototyping**, **video** / `VideoPaint`, **remote libraries**, **`EMBED`**, **`LINK_UNFURL`**, **plugin metadata** (`pluginData`, `sharedPluginData`, `relaunchData`).

## Tool inventory

| Tool | Phase (first useful delivery) | Notes |
|------|-------------------------------|--------|
| `create_new_file` | 1 | Local empty Figma Design file; not “remote drafts”. |
| `get_design_context` | 1 | Returns **HTML + CSS** from Phase 1; **inline SVG** may appear from Phase 4+ for vectors, booleans, masks, and `textPath` ([rendering](./rendering-and-screenshots.md)). |
| `get_metadata` | 1 | Sparse outline: ids, names, types, bounds; format may be **XML-like** or **JSON** if clients allow—pick one and version it. |
| `get_screenshot` | 1 | Raster image from Playwright render. |
| `get_variable_defs` | 5 | No-op or minimal stub before Phase 5; must not misrepresent token data. **Reads only the current file** (no remote libraries). |
| `search_design_system` | 5 | **Phase 5:** substring / token **text search** over **file-local** components/variables/styles. **Later:** **semantic search** (same tool; richer ranking). |
| `use_figma` | 1 | General write path; Phase 1 supports a **strict allowlist** of operations. |
| `upload_assets` | 3 | Store images and return references usable in fills. |

Tools explicitly **not** in scope: `add_code_connect_map`, `get_code_connect_map`, `get_code_connect_suggestions`, `get_context_for_code_connect`, `send_code_connect_mappings`, `get_figjam`, `generate_diagram`, `generate_figma_design`, `get_libraries`, `whoami`, and any Make-specific tools.

---

## `create_new_file`

**Purpose.** Start a new persisted Figma Design document.

**Phase:** 1 (full create); later phases extend default page/component setup only if needed.

**Suggested inputs.**

- `name` (optional): human-readable file title.
- `path` or `directory` (optional): where to write on disk; product defines default workspace folder.

**Outputs.**

- `fileId` / `fileKey` equivalent (local string).
- Absolute `filePath` written.

**Errors.**

- Invalid path, permission denied, name collision policy violation.

---

## `get_metadata`

**Purpose.** Cheap structural overview for agents (matches Figma MCP intent: “sparse representation… layer IDs, names, types, position and sizes”).

**Phase:** 1 minimal; **2+** richer attributes.

**Suggested inputs.**

- `fileKey` or `filePath` (if multi-file supported).
- `nodeId` (optional): subtree root; default = current page or whole document per product rules.

**Outputs.**

- Tree outline in stable lexical order for determinism.

**Errors.**

- Unknown `nodeId`, unloaded page (N/A for headless if all pages eager-loaded).

---

## `get_design_context`

**Purpose.** Provide implementation-ready **web** styling for a node subtree.

**Phase:** 1 for frames + fills + strokes; expands with each [phased roadmap](./phased-roadmap.md) capability.

**Suggested inputs.**

- `nodeId` (required unless selection model exists).
- `options` (optional): `includeCss: boolean` (default true), `inlineCss: boolean`, viewport padding, etc.

**Outputs.**

- `html`: document fragment or full page string; may contain **inline `<svg>`** (Phase 4+) for vectors, booleans, masks, text-on-path.
- `css`: stylesheet text (may be empty if fully inline).

**Fidelity note.** Figma’s hosted MCP optimizes for **LLM interpretation** ([server-returning-web-code.md](../figma-plugin-api/docs/figma-mcp-server/server-returning-web-code.md)); this product optimizes for **deterministic rendering** in Playwright. Both are valid; document differences in [rendering and screenshots](./rendering-and-screenshots.md).

---

## `get_screenshot`

**Purpose.** Capture pixels for a node region.

**Phase:** 1.

**Suggested inputs.**

- `nodeId` (required).
- `format` (optional): `png` default; `jpeg` optional.
- `scale` (optional): number, default 1.

**Outputs.**

- Image bytes (binary MCP content) or base64 per SDK patterns.

**Errors.**

- Node not renderable (e.g., zero size), Playwright failure, timeout.

---

## `use_figma`

**Purpose.** General-purpose **write** tool analogous to remote `use_figma` ([write-to-canvas.md](../figma-plugin-api/docs/figma-mcp-server/write-to-canvas.md)), executed against the **local document engine** instead of cloud JavaScript.

**Phase:** 1 minimal allowlist; expands through **5**.

**Suggested shape (normative for this product).**

Use a structured payload the engine can dispatch without arbitrary JS eval, for example:

- `operation`: enum (`createNode`, `updateNode`, `deleteNode`, `moveNode`, …).
- `node` / `nodeId` fields per operation.
- `properties`: partial node patch in **Figma Plugin API shape** where possible (fills, strokes, characters, layout fields by phase).

**Phase 1 allowlist (Must).**

- Create `FRAME` under a given parent (default: current page).
- Set `x`, `y`, `width`, `height`, `name`.
- Set solid `fills` and `strokes` (single stroke acceptable).

**Later phases.** Expand allowlist per [functional requirements](./functional-requirements.md) without breaking Phase 1 clients (additive properties and operations).

**MCP-only Plugin API extensions (JavaScript `use_figma` scripts).**

The headless clone executes agent scripts against a Plugin API–shaped sandbox. These surfaces match the remote Figma MCP `use_figma` skill and are **not** available in desktop plugins:

| API | Notes |
|-----|--------|
| `figma.createAutoLayout(direction?, props?)` | Auto-layout frame with optional props object |
| `node.query(selector)` / `QueryResult` | CSS-like subtree search |
| `node.matches(selector)` | Selector membership test |
| `node.set(props)` | Batch property updates (`layoutMode` first; `width`/`height` → `resize`) |
| `await node.screenshot(opts?)` | Queues PNG capture; returned inline on the `use_figma` tool response |
| `node.placeholder` | Transient shimmer flag (screenshot compile only; not persisted) |
| `figma.io.write(path, data)` | Attach JSON/CSV/PNG bytes to the tool response |
| `figma.root.query` / `figma.root.matches` | Document-wide selector search |

**Plugin metadata.** `getPluginData` / `setPluginData` remain unsupported. `getSharedPluginData` / `setSharedPluginData` / `getSharedPluginDataKeys` are supported as **in-memory stubs for the script session only** (not written to the envelope; see NG11).

**Page switching.** `figma.currentPage = page` throws `"Setting figma.currentPage is not supported"`; use `await figma.setCurrentPageAsync(page)`.

**Errors.**

- Schema validation failures, unknown parent, unsupported operation for current phase, constraint violations (negative size, etc.).

---

## `get_variable_defs`

**Purpose.** Return variables and styles used in selection (per Figma MCP description).

**Phase:** 5 (before that: return empty structured result with `warnings: ["not_implemented"]]` or omit tool registration—prefer honest stub).

**Suggested inputs.**

- `nodeId` or selection list.

**Outputs.**

- Variables grouped by type; modes; resolved values for active mode.

---

## `search_design_system`

**Purpose.** Text search across components, variables, and styles defined **in the current file** (and the same file’s local registries only). Remote community or org libraries are out of scope ([vision](./vision-and-scope.md) NG9).

**Phase:** 5 for an initial useful implementation.

### Initial implementation (Phase 5)

- **Text search** is sufficient: match on names, descriptions, and other string metadata (substring, case-folding, or simple tokenization—product defines exact rules).
- Results are **ranked** deterministically (for example by match position, field priority, then id).

### Evolution (post–Phase 5 or late Phase 5)

- Add **semantic search**: embed names, descriptions, and relevant metadata; retrieve by vector similarity so natural-language queries (“primary action button”) still surface useful hits when literal text does not match.
- Keep the **same tool name and rough contract** so MCP clients do not need to migrate; optional input flag such as `strategy: "text" | "semantic" | "auto"` if both modes coexist.

**Suggested inputs.**

- `query`: string.
- `types` (optional): filter `component` | `variable` | `style`.
- `strategy` (optional, when semantic search exists): `"text"` | `"semantic"` | `"auto"` (default documented per release).

**Outputs.**

- Ranked matches with ids and short descriptions; later phases may add **relevance scores** and **match snippets** for semantic mode.

---

## `upload_assets`

**Purpose.** Upload images into the file for use as fills (per Figma tool description: PNG/JPG/GIF/WebP, max size).

**Phase:** 3.

**Suggested inputs.**

- Binary content or `dataUrl` or `filePath` (local); product must define one canonical approach.
- Optional `nodeId` to attach as fill.

**Outputs.**

- `assetRef` / `hash` usable in `ImagePaint` in the document model.

---

## Related documents

- [Functional requirements](./functional-requirements.md)
- [Phased roadmap](./phased-roadmap.md)
- [Document model](./document-model.md)
