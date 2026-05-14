# Rendering and screenshots

[← PRD index](./index.md)

## Goals

1. **`get_design_context`** returns **HTML + CSS** (and **inline SVG** where needed) that represents the **supported subset** of the document model ([document model](./document-model.md)).
2. **`get_screenshot`** uses **Playwright** to open that output in a headless browser and capture a **PNG** of the requested node’s bounds (per [Project.md](../Project.md)).

**Excluded from rendering scope** (no DOM fidelity commitment): **video**, **`EMBED`**, **`LINK_UNFURL`**, Dev Mode–only adornments, **prototyping** transitions, **remote** assets not present in the local file.

This approach trades perfect Figma pixel parity for **determinism**, **testability**, and **simplicity**.

## Pipeline

1. **Select subtree** by `nodeId` (including the node itself).
2. **Layout pass** — resolve auto layout and constraints where possible (Phase 4+); compute absolute geometry for rotation, masks, and booleans as needed.
3. **Generate DOM / SVG** — HTML elements for boxes and text; **SVG** for `VECTOR`, `BOOLEAN_OPERATION`, `LINE`, arc ellipses, and **`textPath`** when HTML is insufficient.
4. **Generate CSS** — paints, strokes, typography, effects, radius, opacity, layout, blend modes (partial), blur, clip/mask.
5. **Playwright** — viewport ≥ subtree bounds; clip screenshot to node bounds (+ configurable margin).

## CSS / SVG mapping guidelines

| Figma concept | Phase | Web approach |
|---------------|-------|----------------|
| Frame position/size | 1 | Positioned container; explicit `width`/`height`. |
| Solid fill | 1 | `background-color` / fill on SVG. |
| Stroke (simple) | 1 | `border` or SVG `stroke`. |
| Frame **backgrounds** | 2 | Layer behind children (pseudo-element or z-ordered layer). |
| **clipsContent** | 2 | `overflow: hidden` (+ `border-radius` sync). |
| Opacity | 2 | `opacity`; note stacking context. |
| Node / paint **blendMode** | 2–3 | `mix-blend-mode` / isolation where supported; else warn. |
| Corner radius | 2–3 | Uniform then per-corner `border-radius`; **corner smoothing** approximate (`superellipse` not native—document). |
| Drop / inner shadow (full) | 2 | `box-shadow` / `filter: drop-shadow`; map **spread**, **blendMode**, **`showShadowBehindNode`** as closely as CSS allows. |
| Text (plain + ranges) | 2–3 | HTML `<span>` runs; `text-decoration`, OpenType via `font-feature-settings` subset. |
| Lists | 3 | `<ul>`/`<ol>` + margin/padding parity. |
| Hyperlink | 2–3 | `<a href>` on spans. |
| Linear / radial / angular / diamond gradient | 3 | CSS `linear-gradient`, `radial-gradient`, conic for angular; diamond = approximation or SVG gradient. |
| Image / pattern paint | 3 | `background-image`; pattern may use `background-size`/`repeat` or SVG **pattern** fill. |
| Stroke caps / joins / dashes | 3 | SVG stroke properties for vector shapes; CSS `border-*` + limits on rects. |
| Rotation | 2–4 | `transform: rotate`; compose with `relativeTransform` when non-rotation components exist (subset). |
| Auto layout | 4 | Flexbox: direction, wrap, gap, padding, align, justify, **min/max**, child **flex-grow** / **align-self** / absolute positioning in flex. |
| Layout grid + grid children | 4 | CSS Grid or SVG guides; span/anchor mapping documented. |
| Constraints | 4 | Absolute positioning rules vs parent resize. |
| Page guides | 4 | Non-interactive lines (SVG/CSS) in export overlay optional. |
| Mask | 4 | `clip-path`, `mask-image`, or SVG `<mask>`. |
| Boolean / vector | 4 | SVG `<path>` from `vectorNetwork` or simplified path; boolean via SVG **clip-path** merge or single path if precomputed server-side. |
| Layer / background blur | 4 | `filter: blur` / `backdrop-filter` with limitations. |
| Variables / local styles | 5 | CSS custom properties from resolved or literal values; style ids resolved in compiler. |
| Table | 5 | `<table>` / CSS `display: table` with colspan/rowspan subset. |
| Text on path | 5 | SVG `<textPath>`. |
| Noise / texture effect | 5 | CSS noise (`filter`/`url`), texture image, or **warning** + skip. |

## Known fidelity gaps (acceptable if documented)

- **Video**, **embed**, **link unfurl**, **remote library** assets: not supported ([vision](./vision-and-scope.md)).
- **Boolean** and **vector** fidelity may require server-side flattening to a single path for complex networks.
- **Figma auto layout “hug contents”** vs CSS intrinsic sizing: document mapping and edge cases.
- **PatternPaint** and **TEXTURE** may be visual approximations only.

## Playwright requirements

- Pin browser version where practical for reproducible screenshots.
- Set **fonts** to deterministic stack for tests; optional allowlist for local font files in later phases.
- Timeouts and retries for CI stability ([non-functional requirements](./non-functional-requirements.md)).

## `get_design_context` output contract

Minimum fields in tool result:

- `html` (may include inline SVG fragments)
- `css`
- `warnings`: string array (e.g., skipped noise effect, unsupported blend mode)

Optional:

- `assets`: list of auxiliary asset URLs created for the export

## Acceptance rubric (suggested)

For each phase, maintain **golden** HTML/CSS snapshots and **PNG baselines** in tests (threshold-based image diff allowed).

## Related documents

- [Technical architecture](./technical-architecture.md)
- [Functional requirements](./functional-requirements.md)
- [MCP tools specification](./mcp-tools.md)
- [Vision and scope](./vision-and-scope.md)
