# Functional requirements

[← PRD index](./index.md)

Each requirement has a stable **ID**, a **priority** (Must / Should / Could), and a **Phase** (1–5) where it should be implemented, per [phased roadmap](./phased-roadmap.md).

## Platform and runtime

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| FR-PLAT-001 | Must | 1 | The service runs on **Node.js** and is implemented primarily in **TypeScript**. |
| FR-PLAT-002 | Must | 1 | The service hosts an **HTTP server** on a configurable host/port. |
| FR-PLAT-003 | Must | 1 | The HTTP server exposes **`GET /health`** returning a JSON (or plain) body indicating liveness; suitable for load balancers and smoke tests. |
| FR-PLAT-004 | Should | 1 | Configuration via environment variables or a single config file (port, data directory, log level). |
| FR-PLAT-005 | Should | 2 | Structured logging with request ids for HTTP and MCP tool invocations. |

## MCP server

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| FR-MCP-001 | Must | 1 | Implement MCP using the official [**Model Context Protocol TypeScript SDK**](https://github.com/modelcontextprotocol/typescript-sdk) (`@modelcontextprotocol/sdk`). |
| FR-MCP-002 | Must | 1 | Expose MCP over **Streamable HTTP** or **stdio** as required by deployment; document the default transport in [technical architecture](./technical-architecture.md). |
| FR-MCP-003 | Must | 1 | Register the in-scope tools from [MCP tools specification](./mcp-tools.md); each tool has a defined input schema and structured error on invalid input. |
| FR-MCP-004 | Should | 2 | Tool responses include enough **diagnostics** (node ids touched, warnings) for agent debugging without dumping full trees. |
| FR-MCP-005 | Could | 5 | Optional **rate limiting** or payload guards for very large `use_figma` batches (local abuse protection). |

## Document and persistence

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| FR-DOC-001 | Must | 1 | Maintain a **single authoritative document tree** for the current file, rooted at a document node containing one or more **pages**. |
| FR-DOC-002 | Must | 1 | Every node has a stable **`id`** (string), **`name`**, **`type`**, and geometric **`x`**, **`y`**, **`width`**, **`height`** where applicable. |
| FR-DOC-003 | Must | 1 | Persist the tree to **disk as JSON** after successful mutations (see [document model](./document-model.md) for schema versioning). |
| FR-DOC-004 | Must | 1 | Support **load existing file** from disk path and **atomic save** (write temp + rename) to reduce corruption risk. |
| FR-DOC-005 | Should | 2 | Preserve **child order** (z-index / layer list) identically round-trip through save/load. |
| FR-DOC-006 | Should | 3 | Support **`GROUP`** without changing child absolute positions unless auto layout or transforms dictate otherwise. |
| FR-DOC-007 | Should | 4 | Represent **full auto layout** field set on frames/components/instances: wrap, counter-axis spacing/content, axis sizing modes, min/max, paddings, gap, alignment, child `layoutAlign` / `layoutGrow` / sizing / `layoutPositioning` (see [document model](./document-model.md)). |
| FR-DOC-008 | Should | 4 | Represent **layout grids** and **grid-child** positioning fields; local **`gridStyleId`** only (no remote library). |
| FR-DOC-009 | Must | 5 | Represent **variable bindings** (`boundVariables` on nodes, paints, effects, grids, text fields) and **style references**; support **`explicitVariableModes`** per node. |
| FR-DOC-010 | Should | 5 | Represent **`COMPONENT`**, **`COMPONENT_SET`**, **`INSTANCE`**, **`SLOT`** with variant props, **INSTANCE_SWAP**, overrides, and file-local style ids. |
| FR-DOC-011 | Should | 2 | Model **`FRAME.backgrounds`** and **`clipsContent`** per Plugin API. |
| FR-DOC-012 | Should | 2 | Store or derive **`absoluteBoundingBox`** / **`absoluteRenderBounds`** (or equivalent) for export and screenshots. |
| FR-DOC-013 | Should | 3 | Support scene node types **`RECTANGLE`**, **`ELLIPSE`**, **`LINE`**, **`POLYGON`**, **`STAR`**, **`SHAPE_WITH_TEXT`**, **`SECTION`**, **`SLICE`**, **`HIGHLIGHT`** (see [document model](./document-model.md)). |
| FR-DOC-014 | Should | 4 | Support **`BOOLEAN_OPERATION`**, **`VECTOR`** (path/`vectorNetwork` subset), **`TRANSFORM_GROUP`**; **`isMask`** / **`maskType`**. |
| FR-DOC-015 | Should | 4 | Represent **page `guides`** (ruler guides), not Dev Mode measurements. |
| FR-DOC-016 | Should | 5 | Represent **`TABLE`** / **`TABLE_CELL`** and **`TEXT_PATH`** nodes. |
| FR-DOC-017 | Should | 2 | **Multi-page:** address nodes by id across pages with documented load/current-page semantics (see [phased roadmap](./phased-roadmap.md)). |

## Plugin API emulation (Figma Design)

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| FR-API-001 | Must | 1 | **Compatibility layer** for **FRAME**: geometry, **`fills`** (solid), **`strokes`** + **`strokeWeight`**. |
| FR-API-002 | Must | 2 | **TEXT:** `characters`, typography, alignment, resize/truncation/trim/spacing fields; **range** styles + **URL hyperlinks**; frame **`backgrounds`**, **`clipsContent`**. |
| FR-API-003 | Should | 2 | **Corner radius** (uniform on supported nodes); **rotation**; **opacity**; **visibility**; **node `blendMode`** where used. |
| FR-API-004 | Should | 2 | **Paints:** per-paint **`visible`**, **`opacity`**, **`blendMode`** on solid (and inherited by later paint kinds). |
| FR-API-005 | Should | 2 | **Effects:** **`DROP_SHADOW`**, **`INNER_SHADOW`** with offset, radius, spread, color, blendMode, `showShadowBehindNode` as applicable. |
| FR-API-006 | Should | 3 | **Gradients:** linear, radial, angular, diamond; **`ImagePaint`**; **`PatternPaint`** (best-effort); **no `VideoPaint`**. |
| FR-API-007 | Should | 3 | **Stroke geometry:** `strokeAlign`, `strokeCap`, `strokeJoin`, `miterLimit`, `dashPattern`, **individualStrokeWeights**, **`complexStrokeProperties`** (subset). |
| FR-API-008 | Should | 3 | **Corners:** per-corner radii, **`cornerSmoothing`**; represent mixed/partial styling where required. |
| FR-API-009 | Should | 3 | **Lists**, indentation, list spacing; **OpenType** features on text ranges. |
| FR-API-010 | Should | 4 | **Auto layout** and **layout grids** mutations matching [document model](./document-model.md) field set. |
| FR-API-011 | Should | 4 | **Constraints** on children when parent layout is not auto layout (documented subset). |
| FR-API-012 | Should | 4 | **`LAYER_BLUR`**, **`BACKGROUND_BLUR`** effects. |
| FR-API-013 | Should | 4 | **Mask** semantics (`isMask`, `maskType`) in engine + export pipeline. |
| FR-API-014 | Should | 4 | **Boolean ops** and **vector** path ops sufficient for `BOOLEAN_OPERATION` + `VECTOR` nodes (union/subtract/intersect/exclude). |
| FR-API-015 | Should | 4 | **`constrainProportions`**; transform composition for **`TRANSFORM_GROUP`** + rotation in export. |
| FR-API-016 | Must | 5 | **Variables:** collections, modes, definitions (color/number/string/boolean as needed); bindings for `get_variable_defs`. |
| FR-API-017 | Should | 5 | **File-local styles** (paint/text/effect/grid) + ids on nodes; **no remote library**. |
| FR-API-018 | Should | 5 | **Components:** masters, sets, instances, **slots**, **instance-swap** properties, variant props, overrides; **`documentationLinks`**, **`description`**, **`descriptionMarkdown`** on components (not pluginData). |
| FR-API-019 | Should | 5 | **`NOISE`** and **`TEXTURE`** effects (best-effort CSS or explicit warnings). |
| FR-API-020 | Should | 5 | **`TABLE`** / **`TABLE_CELL`** and **`TEXT_PATH`** creation/edit subset via `use_figma`. |

## Rendering and export

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| FR-REN-001 | Must | 1 | Compile a subtree to **HTML + CSS** for `get_design_context` (plain web output as default); **inline SVG** allowed from **Phase 4** onward per [rendering](./rendering-and-screenshots.md). |
| FR-REN-002 | Must | 1 | **`get_screenshot`** loads compiled HTML/CSS in **Playwright**, sizes viewport to node bounds (+ optional padding), and returns **PNG** screenshot bytes (or base64 per MCP convention). |
| FR-REN-003 | Should | 2 | Screenshot pipeline respects **device pixel ratio** option and background (transparent vs white) as parameters. |
| FR-REN-004 | Should | 2 | Map **frame backgrounds**, **clipsContent**, **rotation**, and **shadow** spread/blend/show-behind in CSS within documented limits ([rendering](./rendering-and-screenshots.md)). |
| FR-REN-005 | Should | 3 | Map **gradients** (all four kinds), **image** and **pattern** fills, **stroke caps/joins/dashes**, **per-corner radius** and **corner smoothing** (approximation ok if documented). |
| FR-REN-006 | Should | 3 | Map **rich text** ranges (styles, lists, links) to HTML/CSS. |
| FR-REN-007 | Should | 4 | **Auto layout**, **layout grids**, **grid children**, **constraints**, **masks**, **booleans**, **vectors** → CSS/SVG strategy per [rendering](./rendering-and-screenshots.md). |
| FR-REN-008 | Should | 4 | Map **layer/background blur** to CSS `filter` / `backdrop-filter` with documented fidelity limits. |
| FR-REN-009 | Should | 5 | Map **variables** and **local styles** to CSS custom properties or resolved literals for export; **tables** and **`textPath`** (SVG) approximations. |
| FR-REN-010 | Could | 5 | **Noise/texture** effects: CSS approximation or omit with **`warnings`** entries. |
| FR-REN-011 | Could | 5 | Optional PDF export remains out of scope unless added later. |

## Tool-specific behavior

See [MCP tools specification](./mcp-tools.md) for parameters and edge cases. Summary mapping:

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| FR-TOOL-001 | Must | 1 | **`create_new_file`** creates a new persisted empty Figma Design document (local). |
| FR-TOOL-002 | Must | 1 | **`get_metadata`** returns sparse structure (ids, names, types, bounds) for selection or current page. |
| FR-TOOL-003 | Must | 1 | **`get_design_context`** returns HTML+CSS for the requested node(s). |
| FR-TOOL-004 | Must | 1 | **`get_screenshot`** returns raster capture for requested node(s). |
| FR-TOOL-005 | Must | 1 | **`use_figma`** executes supported write operations against the active file (Phase 1 subset; expands in later phases). |
| FR-TOOL-006 | Should | 5 | **`get_variable_defs`** returns variables and styles used in selection (names, modes, resolved values for export). |
| FR-TOOL-007 | Should | 5 | **`search_design_system`** searches **file-local** components/variables/styles (no remote library); **Phase 5** implements **text** matching first; **semantic search** later on the same tool ([MCP tools](./mcp-tools.md)). |
| FR-TOOL-008 | Should | 3 | **`upload_assets`** accepts supported image types, enforces max size, stores bytes, returns handles usable by fills. |

## Out of scope (tracked for clarity)

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| FR-OUT-001 | Won’t | — | **Code Connect** tools and workflows are not implemented (per [vision](./vision-and-scope.md)). |
| FR-OUT-002 | Won’t | — | **FigJam**, **Figma Make**, **Slides**, **Buzz** file types and tools. |
| FR-OUT-003 | Won’t | — | Remote Figma authentication (`whoami`), **`get_libraries`** against Figma cloud, **team/remote libraries**, **`importComponentByKeyAsync`** from cloud. |
| FR-OUT-004 | Won’t | — | **Plugin metadata:** `pluginData`, `sharedPluginData`, `relaunchData`. |
| FR-OUT-005 | Won’t | — | **Dev Mode** workflows and APIs (annotations as dev handoff, dev resources on nodes, dev status, canvas measurements, Dev Mode–only mutations, Inspect-only `getCSSAsync` parity). |
| FR-OUT-006 | Won’t | — | **Prototyping:** `reactions`, transitions, overlays, flow navigation. |
| FR-OUT-007 | Won’t | — | **Video:** `VideoPaint`, video **`MEDIA`** nodes, video playback in export. |
| FR-OUT-008 | Won’t | — | **`EMBED`** and **`LINK_UNFURL`** node types. |

## Related documents

- [Phased roadmap](./phased-roadmap.md)
- [MCP tools specification](./mcp-tools.md)
- [Document model](./document-model.md)
- [Rendering and screenshots](./rendering-and-screenshots.md)
