# Phased roadmap

[← PRD index](./index.md)

This roadmap splits delivery into **five phases**. Phase numbers align with **Phase** tags in [functional requirements](./functional-requirements.md). Later phases depend on earlier document and MCP foundations.

**Excluded from all phases** (see [vision and scope](./vision-and-scope.md) NG6–NG11): Dev Mode surfaces, prototyping, **video** / `VideoPaint` / video `MEDIA`, **remote libraries**, **`EMBED`**, **`LINK_UNFURL`**, **plugin metadata** (`pluginData`, `sharedPluginData`, `relaunchData`).

---

## Phase 1 — Foundation and minimal Figma Design

**Objective.** Runnable service, persisted tree, **FRAME** geometry with **solid fills** and **strokes** (weight + color), MCP golden path, HTML/CSS + Playwright screenshot.

**Included capabilities.**

- Embedded HTTP server; **`GET /health`**.
- MCP with TypeScript SDK; tools: `create_new_file`, `get_metadata`, `get_design_context`, `get_screenshot`, `use_figma` (minimal allowlist).
- **Document:** `DOCUMENT` → `PAGE` → `FRAME`; stable **node ids**.
- **Persistence:** atomic JSON save/load.
- **Frames:** `x`, `y`, `width`, `height`, `name`, `fills` (solid), `strokes` + `strokeWeight`.

**Exit criteria.**

- Health → create file → frame + solid fill + stroke → persist → restart → reload → screenshot within tolerance.

**Dependencies.** Node.js, Playwright, MCP SDK.

---

## Phase 2 — Text, frame chrome, effects, and metadata

**Objective.** **TEXT** layers, **frame backgrounds** and **clipsContent**, full **shadow** parameters, **opacity** / **visibility**, **rotation**, richer **get_metadata**, per-paint visibility/opacity/blend on paints, optional **multi-page** addressing.

**Included capabilities.**

- **TEXT:** `characters`; node-level typography (`fontName`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `textAlignHorizontal`, `textAlignVertical`, `textAutoResize`, `textTruncation`, `leadingTrim`, `paragraphSpacing`, `hangingPunctuation`, `hangingList`); **uniform** `cornerRadius` on rect-like nodes where applicable.
- **Styled text (initial):** storage + export for **character ranges** with distinct font/color/size (minimum viable rich text before OpenType/lists in Phase 3).
- **Hyperlinks** on text ranges (URL targets only).
- **FRAME:** `backgrounds` (solid/gradient-ready array), **`clipsContent`**.
- **Effects:** `DROP_SHADOW` and `INNER_SHADOW` including **spread**, **blendMode**, **`showShadowBehindNode`** where API defines them.
- **Opacity** on nodes; **blendMode** on paints (with documented CSS limits).
- **Rotation** on scene nodes; derived **`absoluteBoundingBox`** / render bounds for screenshot where useful.
- **`get_metadata`:** additional fields (visibility, opacity, rotation, text length, effect types, clip flag).
- **Should:** explicit **current page** / load semantics for multi-page JSON files.

**Exit criteria.**

- Frame with background + clipped child + rotated sibling + rich title + shadow matches rubric in [rendering](./rendering-and-screenshots.md).

---

## Phase 3 — Shapes, strokes, gradients, images, pattern, structure

**Objective.** Full **shape** vocabulary (except excluded nodes), **gradient** and **image** and **pattern** paints, **stroke geometry**, **per-corner radius** / **corner smoothing**, **GROUP**, organizational nodes, **`upload_assets`**.

**Included capabilities.**

- **Node types:** `GROUP`, `RECTANGLE`, `ELLIPSE` (incl. `arcData` subset), `LINE`, `POLYGON`, `STAR`, `SHAPE_WITH_TEXT`, `SECTION`, `SLICE`, `HIGHLIGHT`.
- **Paints:** all non-video `Paint` kinds — full **gradient** types, **ImagePaint**, **PatternPaint** (best-effort); per-paint fields from Phase 2.
- **Strokes:** `strokeAlign`, `strokeCap`, `strokeJoin`, `miterLimit`, `dashPattern`, **individualStrokeWeights**, **`complexStrokeProperties`** (supported subset).
- **Corners:** per-corner radii + **`cornerSmoothing`**; represent **`figma.mixed`**-style partial styling where required for text/shape parity.
- **Text:** **bulleted/numbered lists**, list spacing, indentation; **OpenType** feature map per range; extended decorations.
- **`upload_assets`:** binary image ingest; attach to `ImagePaint` / fills.
- **Node `blendMode`** where not already done.

**Exit criteria.**

- File with polygon, star, dashed stroke, gradient + image + pattern fill, grouped section passes screenshot checklist.

---

## Phase 4 — Auto layout, grids, constraints, masks, vectors, booleans

**Objective.** Layout systems that drive responsive-ish HTML/CSS; **masking**; **vector** and **boolean** geometry for non-rect UI.

**Included capabilities.**

- **Auto layout:** `layoutWrap`, `counterAxisSpacing`, `counterAxisAlignContent`, axis sizing modes, **min/max** width/height on auto-layout parents; child **`layoutAlign`**, **`layoutGrow`**, **`layoutSizingHorizontal`**, **`layoutSizingVertical`**, **`layoutPositioning`** (absolute in AL).
- **Layout grids:** full `layoutGrids` + **grid child** span/anchor/track/gap/align fields; local **`gridStyleId`** only.
- **Constraints** on non-auto-layout children (pragmatic subset documented in rendering).
- **Page `guides`** (ruler guides).
- **Masks:** `isMask`, `maskType`; clip in export.
- **`TRANSFORM_GROUP`**.
- **`VECTOR`** with `vectorNetwork` or SVG-compatible path representation; fills/strokes on paths.
- **`BOOLEAN_OPERATION`** (union, subtract, intersect, exclude).
- **`constrainProportions`**; transform matrix parity for export when combined with rotation/layout.

**Exit criteria.**

- Nav bar + wrapping auto layout + grid-based card + masked content + simple boolean of two rects exports without structural collapse; limitations listed in [rendering](./rendering-and-screenshots.md).

---

## Phase 5 — Variables, local styles, components, tables, text path, advanced effects

**Objective.** **Design-system** behavior **inside the file only**: variables (incl. explicit modes), **local** styles, **components** / **sets** / **instances** / **slots** / **instance swap**, **`get_variable_defs`**, **`search_design_system`** (text first, semantic later), **tables**, **text on path**, residual **effects**.

**Included capabilities.**

- **Variables:** collections, modes, definitions; **`boundVariables`** on nodes, paints, effects, layout grids, and text-bindable fields; **`explicitVariableModes`** per node.
- **Styles (file-local):** paint, text, effect, grid styles; ids on nodes (`fillStyleId`, …).
- **Components:** `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, **`SLOT`**; property types **BOOLEAN**, **TEXT**, **VARIANT**, **INSTANCE_SWAP**; overrides + variant matrix.
- **Component metadata:** `description`, `descriptionMarkdown`, `documentationLinks` (not pluginData).
- **`TABLE` / `TABLE_CELL`** basic model + export.
- **`TEXT_PATH`** + SVG `textPath` approximation.
- **Effects:** `NOISE`, `TEXTURE` (best-effort or warned no-op).
- **`search_design_system`** (text → later semantic); **`get_variable_defs`** full for in-scope bindings.

**Exit criteria.**

- Demo: variables + modes + local styles + component set with variants + instance swap + table + `get_variable_defs` / search; screenshot stable.

---

## Cross-phase notes

- **Incremental schema:** versioned JSON ([document model](./document-model.md)).
- **Fidelity:** documented gaps acceptable; **no** video, **no** remote library, **no** pluginData/Dev Mode/prototyping/embed/link unfurl.

## Related documents

- [Functional requirements](./functional-requirements.md)
- [Technical architecture](./technical-architecture.md)
- [MCP tools specification](./mcp-tools.md)
- [Vision and scope](./vision-and-scope.md)
