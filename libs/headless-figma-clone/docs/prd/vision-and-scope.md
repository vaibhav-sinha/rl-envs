# Vision and scope

[← PRD index](./index.md)

## Problem

Agents and tools increasingly rely on **Figma MCP** and the **Plugin API** to read design structure and write canvas updates. A fully local, file-backed **headless** implementation enables development, testing, and automation without depending on Figma’s cloud or desktop runtime, while preserving familiar tool names and workflows.

## Product vision

Deliver a **Node.js / TypeScript** service that:

1. Behaves **similarly to Figma** when accessed through a **subset of the Plugin API** (conceptual parity, not a byte-for-byte reimplementation).
2. Persists all design state as a **JSON metadata tree** on disk whenever edits occur.
3. Defers pixels to export time: **render** a subtree by compiling to **HTML/CSS** and capturing via **Playwright** (headless browser screenshot), as described in [Project.md](../Project.md).
4. Exposes an **embedded HTTP server** hosting an **MCP server** (built with [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)) and auxiliary endpoints (for example `/health`).

## Goals

- **G1.** Support **Figma Design** only (no FigJam, Figma Make, Slides, Buzz).
- **G2.** Provide MCP tools listed in [MCP tools specification](./mcp-tools.md), excluding Code Connect and domains listed under **Non-goals** below (NG3–NG11).
- **G3.** Enable agents to **create and edit** frames and common layer properties through `use_figma` (or equivalent execution path), backed by the persisted tree.
- **G4.** Enable agents to **inspect** structure via `get_metadata` and styling/layout context via `get_design_context` (implementation returns **HTML + CSS** for this product, per [Project.md](../Project.md)).
- **G5.** Support **screenshots** of a node selection via `get_screenshot`, driven by the render pipeline in [Rendering and screenshots](./rendering-and-screenshots.md).

## Non-goals

- **NG1.** No interactive design editor UI (no Figma-like canvas application).
- **NG2.** No WebGL/canvas-based editor renderer; no requirement to match Figma’s internal rendering engine.
- **NG3.** No **Code Connect** tools or workflows (`add_code_connect_map`, `get_code_connect_map`, suggestions, etc.).
- **NG4.** No **Figma REST API** or org/cloud features unless later explicitly added to scope.
- **NG5.** No FigJam or remote-only behaviors that assume Figma authentication (this product is **local-first**; remote semantics are emulated where useful).
- **NG6.** No **Dev Mode** features (annotations-as-dev-workflow, dev status, dev resources on nodes, canvas measurements API, Dev Mode–only editing rules, `getCSSAsync`-as-Inspect parity, etc.).
- **NG7.** No **prototyping** (`reactions`, transitions, overlays, navigation flows).
- **NG8.** No **video**: no `VideoPaint`, no `MEDIA` / video nodes, no video fills or playback in export.
- **NG9.** No **team / remote libraries**: no subscribed org libraries, no `importComponentByKeyAsync` from remote, no cloud library sync; **local** components, variables, and styles defined **inside the file** remain in scope (Phase 5).
- **NG10.** No **`EMBED`** or **`LINK_UNFURL`** node types.
- **NG11.** No **plugin persistence metadata**: no `pluginData`, `sharedPluginData`, or `relaunchData` on nodes (omit from document model and `use_figma`).

## Intended users

- **Developers** integrating MCP clients against a stable local design file representation.
- **QA / tooling** validating agents that call Figma-like MCP tools without network dependency.

## Success measures (high level)

- An MCP client can complete a **golden path**: create file → add frame → set fill/stroke → read metadata → get HTML/CSS → screenshot — entirely offline after dependencies are installed.
- Document state survives **restart** (disk persistence) without corruption of the tree schema for the supported phase.

## Related documents

- [Phased roadmap](./phased-roadmap.md)
- [Functional requirements](./functional-requirements.md)
- [Technical architecture](./technical-architecture.md)
