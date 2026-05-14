# Document model

[← PRD index](./index.md)

## Purpose

The **document model** is the canonical representation of a **Figma Design** file in this product. It is **JSON-serializable**, **persisted to disk**, and is the single source of truth for MCP reads/writes and for HTML/CSS compilation.

Explicit **exclusions** (not stored, not emulated) are listed in [vision and scope](./vision-and-scope.md) (NG6–NG11): Dev Mode, prototyping, video/`VideoPaint`, remote libraries, `EMBED`, `LINK_UNFURL`, plugin metadata.

## Top-level file envelope

**Should** wrap the tree with metadata:

- `schemaVersion`: integer incremented on breaking JSON changes.
- `fileName` / `fileKey`: local identifiers.
- `document`: root node.

## Node types by phase

Aligned with Plugin API [`nodes.md`](../figma-plugin-api/docs/plugins/api/nodes.md). Types in **italics** are permanently out of scope per product exclusions.

### Phase 1 — Minimum tree

| `type` | Notes |
|--------|--------|
| `DOCUMENT` | Root; children: `PAGE`. |
| `PAGE` | Children: scene nodes. Optional `guides` (empty until Phase 4). |
| `FRAME` | Container; `fills`, `strokes`, geometry. |

### Phase 2 — Text and visual polish

| `type` | Notes |
|--------|--------|
| `TEXT` | Plain string + **styled ranges** (see [Text](#text-nodes)); layout fields `textAutoResize`, `textAlignHorizontal` / `textAlignVertical`, `lineHeight`, `letterSpacing`, etc. |

**Additional fields on existing types**

- **`FRAME`**: `backgrounds` (array of `Paint`, Plugin API parity for canvas fill behind children), `clipsContent` (boolean).
- **Transforms**: `rotation` (degrees), optional `relativeTransform` matrix when rotation non-zero or skew introduced later.
- **Geometry helpers (computed or stored)**: `absoluteBoundingBox`, `absoluteRenderBounds` where needed for screenshot/export (readonly semantics in real API; may be derived in headless).

### Phase 3 — Shapes, rich paint, pattern, structure nodes

| `type` | Notes |
|--------|--------|
| `GROUP` | Children only; no independent fills unless modeled like Figma. |
| `RECTANGLE` | `fills`, `strokes`, per-corner radius, `cornerSmoothing`. |
| `ELLIPSE` | Including arc / pie subset if stored (`arcData`). |
| `LINE` | Stroke-based segment. |
| `POLYGON` | Point count + `star` pattern handled via `STAR` or polygon fields. |
| `STAR` | Inner/outer radius fields per API. |
| `SHAPE_WITH_TEXT` | Shape geometry + embedded text. |
| `SECTION` | Large labeled organizational region; children + section header semantics. |
| `SLICE` | Export hint region (bounds + name); no `exportAsync` server unless separately specified—slice participates in metadata and optional export bounds. |
| `HIGHLIGHT` | Simple highlight layer. |

**Not in scope:** *`MEDIA`, `EMBED`, `LINK_UNFURL`, FigJam/Slide/widget nodes* — see [vision](./vision-and-scope.md).

### Phase 4 — Layout, masks, vectors, booleans, transforms

| `type` | Notes |
|--------|--------|
| `BOOLEAN_OPERATION` | `union` \| `subtract` \| `intersect` \| `exclude`; children are contributing shapes/vectors. |
| `VECTOR` | `vectorNetwork` or simplified SVG-compatible path payload; fills/strokes on paths. |
| `TRANSFORM_GROUP` | Grouping with explicit transform inheritance rules matching API where feasible. |

**Layout / frame fields (on `FRAME`, `COMPONENT`, `INSTANCE` where applicable)**

- Auto layout: `layoutMode`, paddings, `itemSpacing`, **`layoutWrap`**, **`counterAxisSpacing`**, **`counterAxisAlignContent`**, `primaryAxisAlignItems`, `counterAxisAlignItems`, **`primaryAxisSizingMode`**, **`counterAxisSizingMode`**, **`minWidth`**, **`maxWidth`**, **`minHeight`**, **`maxHeight`**.
- **Child layout** (on scene children inside auto layout): `layoutAlign`, `layoutGrow`, `layoutSizingHorizontal`, `layoutSizingVertical`, `layoutPositioning` (absolute in auto layout).
- **Layout grids**: `layoutGrids` array; **grid child** fields: `gridRowSpan`, `gridColumnSpan`, `gridRowAnchorIndex`, `gridColumnAnchorIndex`, `gridRowSizes` / `gridColumnSizes`, gaps, `gridChildHorizontalAlign`, `gridChildVerticalAlign`, `gridStyleId` (local style id only).
- **Page `guides`**: ruler guides (position + orientation), not Dev Mode measurements.
- **Masking**: `isMask`, `maskType` on applicable nodes; export applies clipping in HTML/CSS.
- **`clipsContent`** on frames (render + interaction with shadows documented in [rendering](./rendering-and-screenshots.md)).
- **`constraints`** on children when parent is not auto layout (horizontal + vertical enums).
- **`constrainProportions`** on resizable nodes.

### Phase 5 — Tables, text-on-path, components, variables, advanced effects

| `type` | Notes |
|--------|--------|
| `TABLE` / `TABLE_CELL` | Tabular layout; cell text and spans as in API subset. |
| `TEXT_PATH` | Text on vector path; approximate via SVG `textPath` in export. |
| `COMPONENT` | Master; `description`, `descriptionMarkdown`, `documentationLinks` (product/docs metadata, **not** pluginData). |
| `COMPONENT_SET` | Variant matrix container. |
| `INSTANCE` | `mainComponentId`, `componentProperties` (BOOLEAN, TEXT, VARIANT, **INSTANCE_SWAP**, **SLOT**), overrides. |
| `SLOT` | Slot regions for nested instance swap (with component model). |

**Variables and styles (file-local only)**

- Registries: `variableCollections`, `variables`, `modes`.
- **Styles**: paint / text / effect / grid styles with stable ids (`fillStyleId`, `strokeStyleId`, `effectStyleId`, `gridStyleId`, `textStyleId`).
- **Bindings**: `boundVariables` on nodes; on **paints**, **effects**, **layoutGrids**, and **text**-bindable fields per API (`VariableBindable*` families).
- **`explicitVariableModes`**: per-node map of collection id → mode id for overrides.

**Effects (extended)**

- **`LAYER_BLUR`**, **`BACKGROUND_BLUR`**.
- **`NOISE`**, **`TEXTURE`** effects (best-effort CSS or documented no-op with warning).

---

## Common node fields (cross-type)

| Field | Phase | Description |
|-------|-------|-------------|
| `id` | 1 | Stable string; uniqueness required. |
| `type` | 1 | `NodeType` string. |
| `name` | 1 | Layer name. |
| `visible` | 2 | Boolean; default true. |
| `locked` | 3 | Boolean when needed for tooling. |
| `x`, `y`, `width`, `height` | 1 | Layout box (scene nodes). |
| `rotation` | 2 | Degrees; with `relativeTransform` in Phase 4 when non-trivial. |
| `opacity` | 2 | 0…1 |
| `blendMode` | 3 | Node-level blend mode where API supports it. |
| `children` | 1 | Ordered z-order array for containers. |
| `fills` | 1+ | `Paint[]`; Phase 1 solid only. |
| `backgrounds` | 2 | `Paint[]` on frames (and similar) per Plugin API. |
| `strokes` | 1+ | `Paint[]`; stroke geometry Phase 3. |
| `strokeWeight` | 1 | Number; Phase 3+ **individual stroke weights** per side where modeled. |
| `strokeAlign`, `strokeCap`, `strokeJoin`, `miterLimit`, `dashPattern` | 3 | Per API. |
| `complexStrokeProperties` | 3 | When API requires structured stroke caps per vertex (subset). |
| `effects` | 2+ | `Effect[]`; shadows + blur Phase 2–4; noise/texture Phase 5. |
| `cornerRadius` / per-corner | 2–3 | Uniform Phase 2; `topLeftRadius`, … Phase 3; `cornerSmoothing` Phase 3. |
| `layoutMode` … | 4 | Full auto layout field set (see Phase 4 above). |
| `layoutGrids` | 4 | Including styles reference by id. |
| `constraints` | 4 | Child constraints vs parent. |
| `clipsContent` | 2 | Frame clip. |
| `isMask`, `maskType` | 4 | Mask behavior. |
| `boundVariables` | 5 | Including nested keys for fills/strokes/effects/grids/text ranges. |
| `explicitVariableModes` | 5 | Collection → mode id. |

**Omitted by design:** `pluginData`, `sharedPluginData`, `relaunchData`, `devStatus`, `annotations` (Dev workflow), `reactions`, remote library fields.

Exact field names should **mirror the Plugin API** where practical so `use_figma` patches stay intuitive.

## Paints (`fills` / `strokes` / `backgrounds`)

| Phase | Coverage |
|-------|-----------|
| 1 | `SolidPaint` only (`type: "SOLID"`, `color` RGB 0…1, separate opacity if used). |
| 2 | Per-paint **`visible`**, **`opacity`**, **`blendMode`** on each `Paint`. |
| 3 | `GradientPaint`: `GRADIENT_LINEAR`, `GRADIENT_RADIAL`, `GRADIENT_ANGULAR`, `GRADIENT_DIAMOND` with `gradientTransform`, `gradientStops`. `ImagePaint` (no **VideoPaint**). `PatternPaint` (API beta) best-effort. |
| 5 | `boundVariables` on each paint field per API. |

## Effects

| Phase | Coverage |
|-------|-----------|
| 2 | `DROP_SHADOW`, `INNER_SHADOW` with **offset**, **radius**, **spread**, **color** (RGBA), **blendMode**, **`showShadowBehindNode`** where applicable. |
| 4 | `LAYER_BLUR`, `BACKGROUND_BLUR`. |
| 5 | `NOISE`, `TEXTURE` (fidelity per [rendering](./rendering-and-screenshots.md)); **`boundVariables`** on effect fields. |

## Text nodes

| Phase | Coverage |
|-------|-----------|
| 2 | `characters`; node-level `fontName`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `textAlignHorizontal`, `textAlignVertical`, `textAutoResize`, `textTruncation`, `leadingTrim`, `paragraphSpacing`, `hangingPunctuation`, `hangingList`. |
| 2–3 | **Styled ranges**: parallel structure or segments with `start`/`end` and per-range fills, font, size, weight, `textCase`, `textDecoration` (+ color, offset, thickness, style, skipInk per API), `lineHeight`, `letterSpacing`, `hyperlink` (URL targets only). |
| 3 | **Lists**: `listOptions`, list spacing, indentation; **OpenType** features per range (`OpenTypeFeature` map). |
| 5 | `textStyleId`; range `textStyleId`; `getRange*` parity for bound variables on text fields; `TEXT_PATH` node type. |

## Multi-page behavior

| Phase | Coverage |
|-------|-----------|
| 2 | **Should**: lazy or explicit **page load** semantics analogous to `PageNode.loadAsync` / `setCurrentPageAsync` for tools that address nodes by id on non-current pages (headless may default to all pages loaded from JSON—document choice). |

## Components and instances

**Phase 5:** `COMPONENT`, `COMPONENT_SET`, `INSTANCE`, `SLOT` (see Phase 5 table above). Overrides and variant props stored in JSON-serializable form; **no remote** component keys.

## Persistence and migrations

- On load, if `schemaVersion` is older than current code, run **migrations** or reject with actionable error.
- Saves should bump `schemaVersion` only on **breaking** JSON changes.

## Determinism

- **`children` order** is significant (z-order).
- Prefer explicit arrays for overrides and mixed values instead of ambiguous objects.

## Related documents

- [Functional requirements](./functional-requirements.md)
- [Rendering and screenshots](./rendering-and-screenshots.md)
- [Phased roadmap](./phased-roadmap.md)
- [Vision and scope](./vision-and-scope.md)
