# Headless Figma Clone — Product Requirements (PRD)

This folder is the authoritative product specification for the **headless Figma clone**: a local service that exposes **Figma Design** semantics through an **MCP-compatible** surface and a persisted **document metadata tree**, without implementing Figma’s editor UI or a canvas/WebGL renderer.

## How to read this PRD

| Document | Purpose |
|----------|---------|
| [Vision and scope](./vision-and-scope.md) | Problem statement, goals, **explicit exclusions** (Dev Mode, prototyping, video, remote libraries, embed, link unfurl, plugin metadata), personas |
| [Phased roadmap](./phased-roadmap.md) | Five implementation phases: objectives, exit criteria, dependencies |
| [Functional requirements](./functional-requirements.md) | Traceable requirements; each item lists its **phase** |
| [Technical architecture](./technical-architecture.md) | Runtime shape: HTTP host, MCP, document engine, render pipeline |
| [MCP tools specification](./mcp-tools.md) | Tool contracts aligned with Figma MCP naming; Code Connect excluded |
| [Document model](./document-model.md) | JSON tree, node types, persistence, parity notes vs Plugin API |
| [Rendering and screenshots](./rendering-and-screenshots.md) | HTML/CSS mapping, Playwright capture, fidelity expectations |
| [Non-functional requirements](./non-functional-requirements.md) | Performance, reliability, security, testing |

## Phase summary

| Phase | Theme | Summary |
|-------|--------|---------|
| **1** | Foundation | HTTP + health, MCP (TS SDK), persisted tree, **FRAME** + solid fill + stroke, golden-path tools, HTML/CSS + Playwright screenshot |
| **2** | Text + frame chrome | **TEXT** + range styles + links, **frame backgrounds** + **clipsContent**, full shadows, opacity/blend on paints, **rotation**, richer `get_metadata`, bounding boxes |
| **3** | Shapes + paint + strokes | **GROUP** + vector primitives (**RECT**/**ELLIPSE**/**LINE**/**POLYGON**/**STAR**/**SHAPE_WITH_TEXT**/**SECTION**/**SLICE**/**HIGHLIGHT**), all non-video **Paint** kinds + **PatternPaint**, stroke geometry, per-corner radius + smoothing, lists + OpenType, **`upload_assets`** |
| **4** | Layout + masks + vectors | Full **auto layout** + **layout grids** + grid children, **constraints**, **guides**, **masks**, **BOOLEAN_OPERATION** + **VECTOR** + **TRANSFORM_GROUP**, **blur** effects, **constrainProportions** |
| **5** | Tokens + components + tables | **Variables** (incl. explicit modes + bindings on paints/effects/grids/text), **file-local styles**, **COMPONENT_SET** / **INSTANCE** / **SLOT** / **INSTANCE_SWAP**, **TABLE**/**TEXT_PATH**, noise/texture effects, **`get_variable_defs`**, **`search_design_system`** (text → semantic) |

## Source context

Product intent and constraints are derived from [Project.md](../Project.md) and local copies of Figma’s **Plugin API** and **MCP server** documentation under `docs/figma-plugin-api/`. **Code Connect**, FigJam / Make / Slides / Buzz, and the **fixed exclusions** in [vision and scope](./vision-and-scope.md) (NG6–NG11) apply.

## Conventions

- **Phase** on each requirement in [functional-requirements](./functional-requirements.md) is **1–5** and matches [phased-roadmap](./phased-roadmap.md).
- **Must / Should / Could** follow RFC-style priority where used.
