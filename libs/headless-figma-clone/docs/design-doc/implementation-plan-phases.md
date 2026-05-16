# Nine-phase implementation and testing plan

[← Design index](./index.md) · [PRD phased roadmap](../prd/phased-roadmap.md)

This document is the **delivery contract**. Each phase lists **exact code artifacts**, **behavior changes**, **automated tests to add or extend**, and **manual verification** steps.

## Global rules

### Phases 1–6 (baseline product)

- No `pluginData`, Dev Mode, prototyping, video paints, **remote team-library import** (`import*ByKeyAsync` against Figma cloud), `EMBED`, `LINK_UNFURL`.
- Mutations are **transactional**; failed batch leaves disk unchanged.
- JSON save is **atomic** ([Persistence](./persistence.md)).
- **Figma Design only** for canvas features (no FigJam / Slides / Buzz-only nodes or tools) unless a later phase explicitly scopes an exception.

### Phases 7–9 (Plugin API parity track)

These phases deliberately **expand** the `figma` / engine surface toward [Plugin API `figma` global](../figma-plugin-api/docs/plugins/api/figma.md) parity for **local file** workflows. The following **remain excluded** (see also [library README](../../README.md)):

- **Still out:** `pluginData` / `sharedPluginData` / `relaunchData`, Dev Mode (`codegen`, `vscode`, `devResources`, Inspect-only flows), prototyping / reactions, **video** paints and video nodes, **`EMBED`** / **`LINK_UNFURL`**, **subscribed remote team libraries** and **`importComponentByKeyAsync` / `importStyleByKeyAsync` / `importVariableByKeyAsync`** against cloud keys (offline clone cannot authenticate as Figma).
- **Network (opt-in only):** `createImageAsync(url)` and sandbox **`fetch`** are allowed **only** if the host enables an explicit policy (e.g. env flag + URL allowlist / SSRF guards). Default remains **bytes-only** `createImage` / `upload_assets` with no outbound network from the plugin VM.
- **FigJam / Slides / Buzz-only APIs** (`createSticky`, `createConnector`, `createSlide`, canvas grid for Slides, `timer`, …) stay **unimplemented** unless the product explicitly adopts those editors (contradicts current PRD **Figma Design only**).

---

## Manual MCP harness

Use this when validating MCP over **Streamable HTTP** without writing a full client.

### Prerequisite

Built service listening on `HFC_HTTP_PORT` (default `3847`), transport `http`.

### 1) Health (non-MCP)

```bash
curl -sS http://127.0.0.1:3847/health
```

Expect `200` and JSON `{"status":"ok",...}`.

### 2) MCP tool call

Because MCP Streamable HTTP framing depends on the pinned `@modelcontextprotocol/sdk` version, **do not hand-roll** requests in documentation beyond smoke checks. **Binding manual procedure:**

1. Install the official MCP inspector or a small internal script from `tests/manual/mcp-http-call.ts` (add in Phase 1) that:
   - Connects to `http://127.0.0.1:3847/mcp`
   - Calls `tools/list`
   - Calls `tools/call` for `create_new_file` with `{}`
2. Save the script’s stdout JSON to a file for diffing in reviews.

Until that script exists, engineers use **automated test** `tests/integration/mcp-http.smoke.test.ts` as the authoritative harness.

### 3) Debug load file (tests / engineers)

```bash
curl -sS "http://127.0.0.1:3847/files/active?path=$(python3 -c 'import urllib.parse; print(urllib.parse.quote(\"/path/to/file.hfc.json\"))')" \
  -H "content-type: application/json" \
  -d "{\"path\":\"C:\\\\tmp\\\\sample.hfc.json\"}"
```

Use `GET /files/active` to load a workspace file before preview.

---

## Phase 1 — Foundation

### Objectives

Runnable service, persisted tree, `DOCUMENT` → `PAGE` → `FRAME`, solid fills + strokes, MCP golden path, HTML/CSS compile + Playwright screenshot.

### Code artifacts to create

| Path | Purpose |
|------|---------|
| `package.json` | `node>=20`, scripts: `build`, `test`, `start` |
| `tsconfig.json` | `module: NodeNext`, `strict: true` |
| `src/cli.ts` | argv parsing, starts http or stdio |
| `src/server/createHttpServer.ts` | `/health`, `/mcp`, `/files`, `/files/active`, `/preview` |
| `src/mcp/registerTools.ts` | registers `create_new_file`, `get_metadata`, `get_design_context`, `get_screenshot`, `use_figma` |
| `src/mcp/handlers/*.ts` | tool implementations |
| `src/engine/DocumentEngine.ts` | transactions, phase=1 matrix |
| `src/persistence/JsonPersistence.ts` | atomic save/load |
| `src/render/DesignCompiler.ts` | FRAME phase-1 mapping |
| `src/screenshot/PlaywrightScreenshotService.ts` | PNG capture |
| `src/engine/phase-matrix.ts` | machine-readable allowlist |
| `tests/integration/mcp-http.smoke.test.ts` | golden path |
| `tests/fixtures/phase1-minimal.valid.json` | valid fixture |
| `tests/document-model.phase1.test.mjs` | fixture validator (no build) |

### Behavioral specifications

- `create_new_file` writes `*.hfc.json` (suffix **binding**) containing `FileEnvelope` with one `PAGE` named `Page 1` and no scene children initially.
- `use_figma` Phase 1 accepts only `FRAME` under `PAGE` (or nested `FRAME` **optional** — **binding:** nesting `FRAME` in `FRAME` **allowed** Phase 1).

### Automated tests

| Test file | Assertion |
|-----------|-----------|
| `tests/document-model.phase1.test.mjs` | Validates fixtures structure + invariants |
| `tests/integration/mcp-http.smoke.test.ts` | `create_new_file` → `use_figma` create frame → `get_metadata` contains node id → `get_design_context` returns `html` with `hfc-node-` class → `get_screenshot` returns base64 decode > 1KB |
| `tests/integration/persistence.roundtrip.test.ts` | save/load equality |
| `tests/integration/screenshot.frame.test.ts` | PNG dimensions == frame box * scale (±1px) |

### Manual verification (Phase 1)

1. Start: `node dist/cli.js --transport http --http-port 3847`
2. `curl /health` as above.
3. Run MCP smoke script (`tests/manual/...`) OR run `pnpm test tests/integration/mcp-http.smoke.test.ts`.
4. Restart server with `HFC_INITIAL_FILE` pointing to saved file; `get_metadata` shows same ids.

### Exit criteria

- All Phase 1 automated tests green in CI with pinned Playwright browser.
- Cold restart reloads identical tree.

---

## Phase 2 — Text, frame chrome, effects, metadata

### Code artifacts

| Area | Add/change |
|------|------------|
| MCP | Register **`open_file`** tool ([schemas](./tools-schemas.md)) for first-class disk loads |
| Model | `TEXT` types, `styledSegments`, `effects`, `backgrounds`, `clipsContent`, `visible`, `opacity`, `rotation` |
| Engine | phase matrix 2; UTF-16 segment validation |
| Compiler | text spans, backgrounds pseudo-layer, overflow clip, shadows, rotation |
| Metadata DTO | extra fields per PRD |
| Config | screenshot background + DPR defaults |

### Test plan (comprehensive)

Phase 2 tests follow the same **layered** model as [Testing](./testing.md): pure JSON validators (no build), engine/unit tests, compiler snapshots, Playwright golden PNGs, and MCP HTTP integration. Every new surface area should have **at least two** independent signals where practical: one **deterministic string** test (fixture or snapshot) and one **end-to-end** test that exercises the same tree via MCP.

#### Coverage goals (map features → tests)

| Feature area | Engine / validation | Compiler | Integration (MCP) | Visual |
|--------------|----------------------|----------|-------------------|--------|
| `TEXT` + plain characters | UTF-16 length vs `characters` | span markup + font-size/line-height | `use_figma` → `get_design_context` | optional PNG |
| `styledSegments` (mixed styles, hyperlink) | overlap / out-of-range rejection | snapshot HTML/CSS | same + code path | — |
| `backgrounds` on `FRAME` | schema on fixture | background layer in output | `get_design_context` `css` / inline | golden PNG |
| `clipsContent` | boolean on node | `overflow:hidden` (or equivalent) | assert on compiled subtree | golden PNG |
| `effects` (drop shadow) | allowed types in phase matrix | `box-shadow` / filter in CSS | substring or snapshot | golden PNG |
| `rotation` | numeric | `transform: rotate(...)` | substring + snapshot stability | golden PNG |
| `visible` / `opacity` | validation | `display:none` / `opacity` | metadata + compile | PNG optional |
| Metadata DTO extensions | — | — | `get_metadata` shape subset assertions | — |
| **`open_file`** | load path errors | — | `tools/call` success + subsequent `get_metadata` | — |

#### Layer A — Pure fixture validators (`node --test`, no TS build)

Add **`tests/document-model.phase2.test.mjs`**, modeled on `tests/document-model.phase1.test.mjs`:

- Load **`tests/fixtures/phase2-*.json`** (at minimum one “happy path” and one “invalid segments” file kept out of the happy list or loaded only in negative tests).
- Assert envelope invariants from Phase 1 still hold, plus Phase 2 nodes:
  - Scene graph may include `TEXT` under `FRAME` / `PAGE` per phase matrix.
  - `TEXT`: `characters` string; `styledSegments` each with UTF-16 `start`/`end` within length; paints on segments reference allowed paint types.
  - `FRAME`: optional `backgrounds`, `clipsContent`, `effects`, `rotation`, `visible`, `opacity` when present match documented ranges and types.

Keep validators **fast** and **dependency-free** so CI can run `node --test` on PRs that only touch fixtures.

#### Layer B — Engine and persistence

| Test file | Focus |
|-----------|--------|
| `tests/engine/utf16-segments.test.ts` | Overlapping segments, reversed ranges, out-of-bounds ends → **transactional** reject with stable error codes; adjacent non-overlapping segments accepted. |
| Extend **`tests/integration/persistence.roundtrip.test.ts`** (or add `phase2` case file) | Save/load preserves `TEXT` payloads, `effects`, `backgrounds`, and metadata fields without lossy normalization. |

#### Layer C — Compiler snapshots and CSS contracts

| Test file | Assertion |
|-----------|-----------|
| `tests/compiler/text-ranges.snapshot.test.ts` | Vitest `toMatchFileSnapshot` (or inline snapshot) for **HTML + CSS**: mixed-weight spans, color change mid-string, **hyperlink** span produces stable `href` / class pattern per binding doc. |
| `tests/compiler/frame-background-clip.test.ts` | When `clipsContent: true`, compiled wrapper includes clipping contract (`overflow:hidden` or documented equivalent); when `false`, no spurious clip. |
| `tests/compiler/text-rotation-opacity.snapshot.test.ts` (new) | `rotation` + `opacity` on `TEXT` / `FRAME` produce expected `transform` / `opacity` in **extracted CSS** (cover both `inlineCss: true` and `inlineCss: false` if both are supported). |
| `tests/compiler/effects-shadow.snapshot.test.ts` (new) | Known `DROP_SHADOW` (or Phase-2 subset) maps to deterministic shadow CSS. |

Snapshot policy: normalize only **documented** unstable fields (e.g. strip transient ids if any) so snapshots remain meaningful; prefer **subtree compile** helpers over full-file HTML if the compiler API allows.

#### Layer D — Golden PNG (exit scenario)

| Test file | Assertion |
|-----------|-----------|
| `tests/integration/screenshot.phase2-exit.test.ts` (name binding at implementation time) | Fixture or MCP-built tree matching PRD exit: frame with **background**, **clipped** child, **rotated** sibling, **rich title** (`TEXT` + segments), **shadow** → `get_screenshot` vs baseline under `tests/golden/phase2-exit.png` using same threshold policy as Phase 1. |

#### Layer E — MCP HTTP integration (mirror Phase 1 smoke)

Phase 1 proves the wire path with **`tests/integration/mcp-http.smoke.test.ts`**: `create_new_file` → `use_figma` **operations** → `get_metadata` → `get_design_context` → `get_screenshot`, plus a second **`use_figma`** invocation with **`skillNames` + `code`** (sandbox script) that creates a frame, then **`/preview`** checks both nodes appear.

Add **`tests/integration/mcp-http.phase2.design-context.test.ts`** (Vitest + Streamable HTTP client, **`DocumentEngine`** wired like production in `beforeAll`):

1. **`create_new_file`** (or **`open_file`** on a committed `tests/fixtures/phase2-compile-harness.json` once `open_file` exists) to obtain an active document.
2. **`use_figma` — operations path**: batch that builds the Phase 2 showcase subtree (`FRAME` with `backgrounds` + `clipsContent`, nested `TEXT` with `styledSegments` including a link span, sibling with `rotation`, `effects` on a node). Assert `touchedNodeIds` and persisted file JSON if the test reads disk.
3. **`get_metadata`** on the page or root frame: assert new DTO fields appear when expected (types, names, bounds).
4. **`get_design_context`** on a stable `nodeId` (from fixture **or** captured from create response):
   - Parse JSON; assert `html` and **`css`** (when `includeCss: true`) are non-empty strings.
   - **Stable expectations** (choose per binding doc): `html` contains `hfc-node-<id>` markers; `html` or `css` contains substrings for shadow, rotation, clip, and hyperlink behavior.
   - Optional: **`toMatchFileSnapshot`** on normalized `html` + `css` for the harness tree (single committed baseline file under `tests/snapshots/` or beside test).
5. **`use_figma` — code path**: run sandbox **`code`** that uses the Phase-2-exposed `figma` API (e.g. `figma.createText()`, set characters, mixed `setRangeFontSize`, append link, apply `effects`, set `clipsContent` / `rotation` where the shim exposes them). Capture `result.createdNodeIds` (or returned ids from script).
6. **`get_design_context`** again for the script-created subtree root: assert **the same CSS/HTML contracts** as step 4 (so “operations” and “code” paths converge on one compiler output shape).
7. **`get_screenshot`** for the same node (scale 1): assert decode length > threshold (and optionally compare to golden if the script tree dimensions are fixed).
8. **`GET /preview`** (when enabled): assert rendered HTML includes `hfc-node-` classes for nodes created in both step 2 and step 5 (same pattern as Phase 1 smoke).

Add a **narrow** companion test **`tests/integration/mcp-http.open-file.test.ts`** once `open_file` lands: resolve path to `tests/fixtures/phase2-*.json`, call tool, then `get_design_context` to ensure on-disk Phase 2 fixtures compile identically to in-memory builds.

#### Manual verification

1. MCP: create `FRAME` with `backgrounds` + nested rotated `TEXT` with hyperlink span.
2. `get_screenshot` visual check in any image viewer: shadow visible, clipping works.
3. Run **`tests/integration/mcp-http.phase2.design-context.test.ts`** locally after compiler changes; update snapshots only when the output change is intentional.

### Exit criteria

- PRD Phase 2 roadmap exit: “Frame with background + clipped child + rotated sibling + rich title + shadow” covered by golden PNG test.
- **`tests/document-model.phase2.test.mjs`** green on all committed `tests/fixtures/phase2-*.json` used in CI.
- **`tests/integration/mcp-http.phase2.design-context.test.ts`** green: demonstrates both **`use_figma` operations** and **`use_figma` code** produce **`get_design_context`** HTML/CSS matching committed expectations (substring + snapshot), aligning Phase 2 with the Phase 1 MCP proof style.

---

## Phase 3 — Shapes, paints, strokes, assets

### Code artifacts

| Area | Add/change |
|------|------------|
| Model | shape nodes, gradients, image/pattern paints, stroke geometry, `blendMode` on node |
| Persistence | asset sidecar dir + `AssetRegistry` |
| HTTP | optional `GET /assets/:id` |
| MCP | `upload_assets` tool |
| Compiler | SVG primitives for shapes where CSS insufficient (stars/polygons) — **binding:** `POLYGON`/`STAR` emitted as `<svg>` inside node wrapper |

### Test plan (comprehensive)

Phase 3 tests follow the same **layered** model as Phase 2 and [Testing](./testing.md): fixture validators, engine/persistence, compiler snapshots, golden PNGs, and MCP HTTP integration. Each new capability should have **at least two** signals where practical: a **deterministic** test (fixture, snapshot, or substring contract) and an **end-to-end** path (upload → graph → compile → screenshot or HTTP asset fetch).

#### Coverage goals (map features → tests)

| Feature area | Engine / validation | Compiler | Integration (MCP / HTTP) | Visual |
|--------------|----------------------|----------|--------------------------|--------|
| Shape nodes (`RECTANGLE`, `ELLIPSE`, `LINE`, `POLYGON`, `STAR`, etc. per PRD) | phase matrix + geometry bounds on fixtures | SVG wrapper for `POLYGON`/`STAR`; CSS for rects/lines where binding | `use_figma` create shapes → `get_design_context` | golden PNG for shape mix |
| Solid + **gradient** fills | paint refs valid on fixture | `linear-gradient` / `radial-gradient` / documented subset in CSS or SVG defs | same subtree via MCP | PNG optional |
| **Image** / **pattern** paints + `imageHash` | registry lookup, missing hash errors | `url(...)` or documented pattern maps to `/assets/:id` or data URI policy | `upload_assets` → assign fill → screenshot | golden PNG with known bitmap |
| **Stroke** geometry (weight, caps, joins, dash) | validation ranges | stroke attributes in SVG/CSS per binding | `get_design_context` substring or snapshot | PNG for thick stroke + dash |
| **`blendMode`** on node | allowed enum in phase matrix | `mix-blend-mode` / `isolation` per binding doc | metadata + compile | optional PNG |
| **`upload_assets`** | size/MIME/type rejection (transactional) | — | `tools/call` success payload contains ids/hashes; negative cases stable error shape | — |
| **`GET /assets/:id`** | — | — | HTTP client: 200 for registered id, 404 for unknown; bytes match upload (hash or length) | — |
| **Persistence** sidecar | round-trip asset files + envelope refs | — | restart process / `open_file` → same `imageHash` resolves | — |

#### Layer A — Pure fixture validators (`node --test`, no TS build)

Add **`tests/document-model.phase3.test.mjs`**, modeled on phase 1/2 validators:

- Load **`tests/fixtures/phase3-*.json`** (happy path + at least one negative: invalid gradient stops, bad `imageHash`, stroke values out of range — negative files excluded from the “all fixtures must parse” list or asserted to fail explicitly).
- Assert Phase 1–2 invariants still hold, plus Phase 3:
  - Allowed shape node types under parent per phase matrix.
  - Paints: gradient structure, image paints reference `imageHash` only when present in same fixture’s declared registry **or** document binding for inline tests.
  - Strokes and `blendMode` fields match documented enums and numeric ranges.

#### Layer B — Engine, assets, and persistence

| Test file | Focus |
|-----------|--------|
| `tests/assets/upload.validation.test.ts` (extend) | Oversize body, bad MIME, empty payload, duplicate upload idempotency policy (per binding): stable rejection codes; successful register updates `AssetRegistry` only after validation passes. |
| `tests/assets/registry.resolve.test.ts` (new) | Resolve by hash after register; unknown hash returns documented engine/compiler error; transactional batch with invalid hash does not partially write sidecar. |
| **`tests/integration/persistence.roundtrip.test.ts`** (extend) | Save/load preserves shape geometry, gradient/stroke/blend fields, and **sidecar asset files** + envelope paths; no orphan files after failed save (atomicity). |

#### Layer C — Compiler snapshots and CSS/SVG contracts

| Test file | Assertion |
|-----------|-----------|
| `tests/compiler/gradient.snapshot.test.ts` (extend) | Snapshots for linear + radial (Phase-3 subset): stops, angle, `gradientTransform` if supported; both `inlineCss: true` / `false` if applicable. |
| `tests/compiler/shape-polygon-star.snapshot.test.ts` (new) | `POLYGON` / `STAR` emit **`<svg>` inside node wrapper** with deterministic viewBox and path `d` (normalize only documented floats). |
| `tests/compiler/stroke-and-blend.snapshot.test.ts` (new) | Known stroke + `blendMode` produce stable CSS/SVG fragments per binding. |
| `tests/compiler/image-fill-url.test.ts` (new) | Compiled output references asset URL pattern agreed in persistence doc (`/assets/:id` or inline policy); no broken `url()` for registered hash. |

#### Layer D — Golden PNG (exit scenario)

| Test file | Assertion |
|-----------|-----------|
| `tests/integration/screenshot.phase3-exit.test.ts` (name binding at implementation time) | Fixture `tests/fixtures/phase3-showcase.json` (or MCP-built equivalent): mix of **gradient** fills, **image** fill from uploaded bytes, **stroked** shape, **`POLYGON`/`STAR`** SVG branch, **`blendMode`** overlap → `get_screenshot` vs `tests/golden/phase3-exit.png` with same threshold policy as Phase 1/2. |

#### Layer E — MCP HTTP integration

Add **`tests/integration/mcp-http.phase3.assets-and-shapes.test.ts`**:

1. **`create_new_file`** or **`open_file`** on `tests/fixtures/phase3-compile-harness.json` once committed.
2. **`upload_assets`**: one small PNG `dataUrl`; assert response includes stable id/hash fields per tool schema; optional second call tests idempotency or rejection rules from binding doc.
3. **`GET /assets/:id`** (when server exposes it): assert status, `content-type`, and body length/hash match upload.
4. **`use_figma` — operations path**: batch creating shapes with gradient fill, image fill referencing returned hash, stroke variants, `blendMode`; assert `touchedNodeIds` and persisted JSON (and sidecar on disk if test reads files).
5. **`get_metadata`**: bounds/types for new shape nodes; asset-related fields if exposed in DTO.
6. **`get_design_context`**: non-empty `html`/`css`; substrings or snapshot for gradient, stroke, blend, and **`<svg>`** for polygon/star; image fill resolves (substring match for asset URL or embedded policy).
7. **`use_figma` — code path** (if Phase-3 `figma` API exposes fills/assets): script creates rectangle + sets image fill from uploaded hash; **`get_design_context`** matches same contracts as step 6.
8. **`get_screenshot`** on showcase frame: decode length > threshold; optional pixel-compare to harness baseline if dimensions fixed.
9. **`GET /preview`** (when enabled): `hfc-node-` classes for nodes from steps 4 and 7.

Companion: extend **`tests/integration/image-fill.test.ts`** or fold into above: upload → assign `ImagePaint` → screenshot non-empty; add negative “invalid hash” MCP round-trip.

#### Manual verification

1. `upload_assets` with small PNG `dataUrl`; note returned hash.
2. `use_figma` / fixture: `RECTANGLE` with `ImagePaint` referencing hash; `get_screenshot` shows image placement.
3. Gradient + dashed stroke + `POLYGON` in one frame; confirm SVG subtree in `get_design_context` HTML.
4. After server restart + `open_file`, same file loads and image fill still renders (proves sidecar + registry).

### Exit criteria

- **`tests/document-model.phase3.test.mjs`** green on all committed `tests/fixtures/phase3-*.json` used in CI.
- **`tests/integration/screenshot.phase3-exit.test.ts`** green against `tests/fixtures/phase3-showcase.json` (or MCP-built twin) and `tests/golden/phase3-exit.png`.
- **`tests/integration/mcp-http.phase3.assets-and-shapes.test.ts`** green: `upload_assets`, asset HTTP fetch (if enabled), shape compile contracts, and convergence of **operations** vs **code** paths on `get_design_context` where the code path exists.

---

## Phase 4 — Auto layout, grids, masks, vectors, booleans

### Code artifacts

| Area | Add/change |
|------|------------|
| Engine | compile-only auto layout resolver + constraints |
| Model | `VECTOR`, `BOOLEAN_OPERATION`, `TRANSFORM_GROUP`, mask fields, layout grid fields |
| Compiler | flex/grid, svg mask/boolean, backdrop blur |

### Test plan (comprehensive)

Phase 4 adds **layout resolution** and **vector/mask/boolean** compilation. Tests must prove: (1) **layout output** matches resolved geometry from document fields, (2) **compile-only** resolution never mutates persisted JSON, (3) **SVG-heavy** branches (`VECTOR`, boolean ops, masks) are stable, and (4) MCP end-to-end matches compiler snapshots for the same trees.

#### Coverage goals (map features → tests)

| Feature area | Engine / layout | Compiler | Integration (MCP) | Visual |
|--------------|-----------------|----------|-------------------|--------|
| **Auto layout** (direction, gap, padding, alignment, child sizing) | resolver unit tests on small trees; wrapping cases | `display:flex`, `flex-direction`, `gap`, `align-*`, `justify-*` per binding | `use_figma` build nav bar → `get_design_context` | golden PNG nav bar |
| **Constraints** / min-max / flex grow | numeric validation + resolver output | CSS flex child properties | substring + snapshot | optional PNG |
| **Layout grids** (columns, rows, gutters) | fixture validation | `display:grid` + template tracks | MCP + snapshot | golden PNG grid overlay |
| **`TRANSFORM_GROUP`** | hierarchy + matrix rules | nested transform CSS order | `get_metadata` + compile | PNG optional |
| **Mask fields** (alpha / vector mask per PRD) | mask graph valid, no cycles | SVG `<mask>` or CSS `mask` per binding | design context + snapshot | golden PNG masked region |
| **`VECTOR`** | path data validation | `<svg>` / `<path>` deterministic | MCP path | PNG |
| **`BOOLEAN_OPERATION`** | operand types in matrix | combined `<svg>` boolean region | MCP | PNG |
| **Backdrop blur** (if in Phase-4 subset) | effect allowed in matrix | `backdrop-filter` in CSS | substring + snapshot | golden PNG |
| **Ephemeral compile** | no disk mutation on compile | — | `get_design_context` twice; file mtime unchanged | — |

#### Layer A — Pure fixture validators (`node --test`, no TS build)

Add **`tests/document-model.phase4.test.mjs`**:

- Load **`tests/fixtures/phase4-*.json`** (happy + negative: invalid grid spec, mask cycle, boolean with wrong child types).
- Assert Phase 1–3 invariants plus auto-layout/grid/mask/boolean/vector fields per schema and phase matrix.

#### Layer B — Layout engine and persistence

| Test file | Focus |
|-----------|--------|
| `tests/layout/autolayout.flexbox.snapshot.test.ts` (extend) | Small trees: row/column, gap, padding, wrap; snapshot **resolved** flex CSS (or intermediate DTO if exposed) — document expected stability rules. |
| `tests/layout/autolayout.constraints.test.ts` (new) | Min/max width/height, flex grow/shrink: known inputs → known CSS subset. |
| `tests/layout/layout-grid.snapshot.test.ts` (new) | Column/row templates + gutters → deterministic grid CSS. |
| **`tests/layout/ephemeral-no-persist.test.ts` (extend)** | `DocumentEngine` compile / `get_design_context` path: **no mutation** of in-memory document beyond documented caches; persisted file byte-identical when compile-only APIs invoked (assert pre/post hash or mtime). |

#### Layer C — Compiler snapshots (SVG mask, boolean, vector)

| Test file | Assertion |
|-----------|-----------|
| `tests/compiler/boolean-svg.test.ts` (extend) | Union/subtract/intersect (Phase-4 subset): two rects → deterministic `<svg>`; include case with rounded rect if supported. |
| `tests/compiler/vector-path.snapshot.test.ts` (new) | `VECTOR` with known commands → stable `d` and viewBox. |
| `tests/compiler/mask.snapshot.test.ts` (new) | Frame with mask child: `<mask>` / CSS mask per binding; clip vs mask distinction covered. |
| `tests/compiler/backdrop-blur.snapshot.test.ts` (new, if feature in scope) | `backdrop-filter` string stable for fixed blur radius. |

#### Layer D — Golden PNG (exit scenario)

| Test file | Assertion |
|-----------|-----------|
| `tests/integration/screenshot.phase4-exit.test.ts` | Fixture **`tests/fixtures/phase4-nav-grid-mask.json`**: auto-layout nav with wrap, **layout grid**, **masked** region, **boolean** or **vector** accent, optional backdrop blur → `get_screenshot` vs `tests/golden/phase4-exit.png`. |

#### Layer E — MCP HTTP integration

Add **`tests/integration/mcp-http.phase4.layout-and-vectors.test.ts`**:

1. **`open_file`** on `tests/fixtures/phase4-compile-harness.json` or build via **`use_figma` operations** to match PRD exit subtree (nav + grid + mask + boolean/vector).
2. **`get_metadata`**: layout-related DTO fields (direction, gap, grid) where exposed; stable ids for snapshot anchoring.
3. **`get_design_context`**: assert `display:flex` / `display:grid` / gap / padding substrings or normalized snapshot; mask and boolean/vector produce expected SVG markers (`<mask>`, combined path, etc.).
4. **`use_figma` — code path** (if API exposes layout/mask): script creates auto-layout frame + child; second call applies mask or boolean; **`get_design_context`** matches same CSS/SVG contracts as operations path.
5. **`get_screenshot`**: compare to `tests/golden/phase4-exit.png` (or harness-specific baseline) at fixed scale.
6. **Ephemeral check**: after steps 1–5, re-read saved `.hfc.json` from disk (if test uses temp file): byte equality with pre-test baseline unless the test intentionally committed mutations in step 1 only (document pattern: separate “compile-only” invocation on a copy).

#### Manual verification

1. Build nav bar fixture with wrapping; `get_design_context` shows `display:flex` and gap/padding matching document.
2. Grid: inspect track sizes and gutters in HTML/CSS vs fixture.
3. Mask + boolean/vector region visually in screenshot viewer.

### Exit criteria

- **`tests/document-model.phase4.test.mjs`** green on committed `tests/fixtures/phase4-*.json`.
- **`tests/layout/ephemeral-no-persist.test.ts`** proves compile/layout resolution does not corrupt persisted JSON.
- **`tests/integration/screenshot.phase4-exit.test.ts`** green for `tests/fixtures/phase4-nav-grid-mask.json` and `tests/golden/phase4-exit.png`.
- **`tests/integration/mcp-http.phase4.layout-and-vectors.test.ts`** green: flex/grid/mask/boolean (and vector if in scope) validated via **`get_design_context`** with operations vs code path convergence where applicable.

---

## Phase 5 — Variables, styles, components, tables, text path

### Code artifacts

| Area | Add/change |
|------|------------|
| Model | variables, styles, components, tables, text path |
| MCP | register `get_variable_defs`, `search_design_system` |
| Compiler | CSS variables + component expansion |

### Test plan (comprehensive)

Phase 5 tests prove **design tokens** flow to compiled CSS (`var(--...)`), **components** expand deterministically, **tables** render with stable structure, **text-on-path** compiles, and MCP tools **`get_variable_defs`** / **`search_design_system`** return stable, ranked results (NFR-TEST-003).

#### Coverage goals (map features → tests)

| Feature area | Model / engine | Compiler | MCP tools | Visual |
|--------------|----------------|----------|-----------|--------|
| **Variables** (collections, modes, bindings) | validation + resolve for active mode | `:root` / scope CSS variables; bound color/number in output | `get_variable_defs` JSON shape + snapshot | optional PNG swatch |
| **Styles** (text/fill/effect styles) | defs + consumption on nodes | class or var indirection per binding | `search_design_system` hits style names | — |
| **Components** / instances | main + overrides | expanded subtree order stable | search + `get_design_context` includes instance output | golden PNG |
| **Tables** | rows/columns/cells model | `<table>` or grid binding per doc | MCP create + compile | golden PNG or DOM snapshot |
| **Text path** | path ref valid for `TEXT` | SVG text on path or documented mapping | `get_design_context` substring + snapshot | PNG optional |

#### Layer A — Pure fixture validators (`node --test`, no TS build)

Add **`tests/document-model.phase5.test.mjs`**:

- Load **`tests/fixtures/phase5-*.json`** (happy + negative: unbound variable, mode mismatch, component circular reference if detectable, table cell out of bounds).
- Assert variable/style/component/table/text-path fields per PRD and phase matrix.

#### Layer B — Resolution engine (variables + styles)

| Test file | Focus |
|-----------|--------|
| `tests/variables/get-variable-defs.test.ts` (extend) | Active mode selection; bound color/number/string; **unknown id** stable error; large collection performance smoke (optional budget assert). |
| `tests/variables/resolve-for-node.test.ts` (new) | Node with bound paint uses correct mode value after mode switch in fixture (if engine supports mode switching without re-save). |

#### Layer C — Compiler snapshots (CSS variables, components, tables, text path)

| Test file | Assertion |
|-----------|-----------|
| `tests/compiler/css-variables.snapshot.test.ts` (new) | Fixture with collection: compiled CSS contains `var(--token)` definitions + usages; normalize only documented unstable parts. |
| `tests/compiler/component-instance.snapshot.test.ts` (new) | Main component + two instances with overrides → stable DOM order and override precedence in HTML snapshot. |
| `tests/compiler/table.snapshot.test.ts` (new) | Known table fixture → stable table/grid markup per binding. |
| `tests/compiler/text-path.snapshot.test.ts` (new) | `TEXT` on path → stable `<textPath>` or equivalent fragment. |

#### Layer D — Golden PNG + JSON snapshot (exit scenario)

| Test file | Assertion |
|-----------|-----------|
| `tests/integration/screenshot.phase5-exit.test.ts` | PRD Phase 5 demo fixture: components + variables affecting visible fills + table + text path (subset per PRD) → `get_screenshot` vs `tests/golden/phase5-exit.png`. |
| `tests/integration/variable-defs.phase5.snapshot.test.ts` (new) | Same fixture: `get_variable_defs` response **`toMatchFileSnapshot`** normalized (sort keys, strip nondeterministic ids only if binding allows stable synthetic ids in tests). |

#### Layer E — MCP HTTP integration

Add **`tests/integration/mcp-http.phase5.design-system.test.ts`**:

1. **`open_file`** on committed **`tests/fixtures/phase5-demo.json`** (PRD-aligned) or `create_new_file` + **`use_figma`** build of the same tree.
2. **`get_variable_defs`**: assert required top-level keys; for each variable in fixture, name/type/value match expected subset; snapshot full response for demo file.
3. **`search_design_system`**: queries for component name substring, style name, and variable name; assert **deterministic ordering** and stable scores/ranks across runs (ties broken per NFR-TEST-003); empty query and no-match behavior documented and asserted.
4. **`get_design_context`** on component instance root: CSS variables applied; instance overrides visible in HTML/CSS snapshot.
5. **`get_metadata`** (if extended): locators for components/variables/styles for debugging.
6. **`use_figma` — code path** (if API exposes variables/components): script reads/changes bound variable or creates instance; **`get_variable_defs`** / **`get_design_context`** reflect change; matches operations-path expectations.
7. **`get_screenshot`** + optional **`GET /preview`** parity with prior phases for nodes touched in step 6.

Extend **`tests/search/design-system.text.test.ts`**: rank stability, pagination/limit if tool supports `limit`/`cursor`, and case-folding rules per binding.

#### Manual verification

1. `search_design_system` with query matching a component name substring; order identical across repeated calls.
2. Change active mode in document (if UI/host provides); `get_variable_defs` and compiled colors update consistently.
3. Visual check: table alignment + text on path in screenshot.

### Exit criteria

- **`tests/document-model.phase5.test.mjs`** green on committed `tests/fixtures/phase5-*.json`.
- **`tests/integration/screenshot.phase5-exit.test.ts`** + **`tests/integration/variable-defs.phase5.snapshot.test.ts`** green for the PRD Phase 5 demo fixture.
- **`tests/integration/mcp-http.phase5.design-system.test.ts`** green: `get_variable_defs`, `search_design_system`, and **`get_design_context`** prove variables + components (+ tables/text path when in PRD scope) end-to-end, with **deterministic search ordering** verified.

---

## Phase 6 — `use_figma` script parity with engine + JSON operations

### Objectives

Close the gap where the document **engine** and legacy **`operations`** batch already support behavior, but the sandbox **`code`** path (`src/mcp/useFigmaScript.ts`) does not expose it on the `figma` global or on runtime node classes. After Phase 6, any mutation expressible via **`ENGINE_MATRIX`** / `useFigmaMap` **createNode** + **updateNode** + **deleteNode** + **moveNode** for allowed types should also be reachable from **Plugin-API-shaped script** (within existing global rules: no `pluginData`, no remote libraries, no Dev Mode UI, etc.).

This phase is **not** about implementing the full Figma Plugin API surface beyond what the **existing engine matrix** already supports (fonts, full `figma.variables`, `showUI`, remote team library import, `createAutoLayout`, FigJam-only factories, etc.)—**Phases 7–9** cover that broader parity; Phase 6 only bridges **script vs `operations`** for the **current** matrix.

### Code artifacts

| Area | Add/change |
|------|------------|
| `src/mcp/useFigmaScript.ts` | **Factories:** `figma.createRectangle`, `createLine`, `createEllipse`, `createPolygon`, `createStar`, and a way to create **`BOOLEAN_OPERATION`** subtrees consistent with the engine (prefer **`figma.union` / `subtract` / `intersect` / `exclude`** as in [figma.md](../figma-plugin-api/docs/plugins/api/figma.md) over deprecated `createBooleanOperation`). **Discovery + mutation:** `figma.getNodeById` and `figma.getNodeByIdAsync` returning **script-bound handles** that mirror live nodes: read/write typed fields allowed by `ENGINE_MATRIX.patchKeysByType`, **`remove()`** → `deleteNode`, **`insertChild` / reorder** where Figma allows, and **reparent** via `moveNode` (or parent `appendChild` that performs detach+attach, matching Figma semantics). **Root/pages:** `figma.root` should expose `DocumentNode`-like access (at minimum `id` + children pages) so scripts can target `DOCUMENT` as parent when adding pages, if engine supports it (see binding below). |
| Runtime classes (`Runtime*`, add `RuntimeEllipse`, `RuntimeLine`, `RuntimePolygon`, `RuntimeStar`, `RuntimeBooleanOperation`, … as needed) | Extend **`toNewNodeSpec()`** and mutable fields so **every** patchable key in **`ENGINE_MATRIX`** (`src/engine/phase-matrix.ts`) for script-created nodes is settable **before first append** and, via handles, **after** attach: e.g. **`isMask`**, **`layoutAlign`**, **`layoutGrow`**, **`minWidth` / `maxWidth` / `minHeight` / `maxHeight`** on all types where the matrix allows; **`strokeAlign`**, **`strokeCap`**, **`strokeJoin`**, **`miterLimit`**, **`fillStyleId`** on **`RuntimeRectangle`**; full **stroke + path** fields on **`RuntimeVector`** (not only `fills`); **`textOnPath`**, **`textStyleId`** on **`RuntimeText`**; **`arcData`** on ellipse, **`pointCount`** / **`innerRadius`** on polygon/star where applicable. Align **`figma.createTable`** signature with Figma’s optional `(rows?, cols?)` if practical. |
| `src/mcp/useFigmaMap.ts` / `src/engine/phase-matrix.ts` / `DocumentEngine.ts` | **Binding — new pages:** Reference Figma exposes **`figma.createPage()`**. If the engine does not yet allow **`createNode`** with parent **`DOCUMENT`** and child **`PAGE`**, Phase 6 **extends** the matrix + validation + `CREATE_NODE_TYPES` (or equivalent) so scripts and JSON can append pages consistently; enforce “at least one page” invariant on delete. If already supported, document and add tests only. |
| `docs/design-doc/tools-schemas.md` | Update the **`use_figma` / script path** section: list Phase-6 `figma` members and the handle model (`getNodeById`, mutation methods) so agent prompts and skills stay accurate. |
| `docs/design-doc/document-engine.md` | Cross-link Phase 6; note that script and **`operations`** paths must stay **capability-equivalent** for the supported subset. |

### Behavioral specifications

- **Single transaction:** The script still runs to completion; all handle mutations queue **`EngineOperation`** entries; the host applies **one** `applyTransaction` batch (same as today). No partial apply on validation failure.
- **Stale handles:** If a queued `deleteNode` removes a node, subsequent ops on that id fail with a **stable** error code (document choice: e.g. `UNKNOWN_NODE` or `VALIDATION_ERROR` with message prefix); tests must lock this behavior.
- **Boolean helpers:** `union` / `subtract` / `intersect` / `exclude` accept operand collections + parent + optional index, produce a **`BOOLEAN_OPERATION`** (or reparent into an existing one per Figma contract—pick one model and test it); operand types must match **`ENGINE_MATRIX`** (`BOOLEAN_OPERATION` children: rectangle, ellipse, polygon, star, vector only).
- **Parity check:** For each property in `ENGINE_MATRIX.patchKeysByType` for types creatable from script, either (a) the property is settable on the runtime class before append, or (b) settable on the post-`getNodeById` handle after append, or (c) explicitly documented as **script-excluded** with rationale (should be empty after Phase 6 exit).

### Test plan (comprehensive)

Phase 6 tests prove **equivalence**: the same document state can be reached via **`operations`** or via **`code`**, and **`get_design_context`** / **`get_metadata`** outputs match (normalized) where the phase matrix allows.

#### Coverage goals (map features → tests)

| Feature area | Script API | Engine | Integration (MCP) |
|--------------|------------|--------|---------------------|
| Shape factories | `createRectangle`, `createLine`, `createEllipse`, `createPolygon`, `createStar` | same `NewNodeSpec` as JSON `createNode` | dual-path test vs operations |
| Mask + layout-self fields | set on frame/text/shape before append + via handle | `updateNode` / create payload | compile: mask CSS/SVG unchanged vs ops path |
| Text extras | `textOnPath`, `textStyleId` on script + handle | validation vs styles / path node | `get_design_context` substring or snapshot |
| Stroke completeness | rect + vector strokes, caps, joins, align | matrix keys | compiler snapshot parity |
| Booleans | `figma.union` (and siblings) | `BOOLEAN_OPERATION` | same subtree as JSON-created boolean |
| Structural edits | `remove`, move/reparent, property patch | `deleteNode`, `moveNode`, `updateNode` | round-trip + error on stale id |
| Pages | `createPage` (if engine extended) + patch page fields via handle | `createNode` / `updateNode` | metadata + `currentPage` switch |

#### Layer A — Unit tests (`useFigmaScript`)

| Test file | Assertion |
|-----------|-----------|
| `tests/mcp/useFigmaScript.phase6.factories.test.ts` (new) | Each `figma.create*` returns detached nodes; `appendChild` yields ids; specs match engine expectations for defaults (e.g. polygon `pointCount`, star `innerRadius`). |
| `tests/mcp/useFigmaScript.phase6.handles.test.ts` (new) | `getNodeById` returns handle for existing fixture node; assign patch keys → queued `updateNode` ops; `remove()` queues `deleteNode`; reparent queues `moveNode`; stale handle throws/errors as specified. |
| `tests/mcp/useFigmaScript.phase6.booleans.test.ts` (new) | `union`/`subtract`/… on ≥2 operands produces same op sequence or equivalent tree as golden JSON builder helper. |

#### Layer B — Compiler / design-context parity (no new compile features required)

| Test file | Assertion |
|-----------|-----------|
| Extend **`tests/compiler/phase1-compile-html-exact.test.ts`** or add **`tests/compiler/script-vs-ops-parity.test.ts`** | For a fixed harness tree: build once via **normalized `operations`**, once via **`runUseFigmaScript`**, compare **normalized** `get_design_context` output (or compiled HTML/CSS helper) — must be identical modulo documented ordering. |

#### Layer C — MCP HTTP integration

Add **`tests/integration/mcp-http.phase6.script-parity.test.ts`**:

1. **`create_new_file`** or **`open_file`** on a small harness fixture.
2. Build target tree A using **`use_figma` `operations`** only; capture `touchedNodeIds`, persist path if applicable.
3. Reset file (new file or reload fixture); build tree B using **`use_figma` `code`** only; assert same **`get_metadata`** shape (ids may differ—use **structural** equality: types, parent-child shape, bounds) **or** normalize ids in test by returning a mapping from script `result`.
4. **`get_design_context`** on equivalent roots: **snapshot or deep-equal** normalized HTML/CSS (same policy as Phase 2 “operations vs code converge”).
5. Negative: `getNodeById` unknown id → `null` or rejected per chosen API; delete then mutate → stable error.

#### Manual verification

1. Run a script that creates **`RECTANGLE`** + **`BOOLEAN_OPERATION`** via **`figma.subtract`**, sets **`isMask`** on a child, edits **`textOnPath`**, then **`remove()`**s a node; reload file and confirm structure in JSON.
2. Compare **`get_design_context`** side-by-side with an **`operations`**-only batch that encodes the same intent.

### Exit criteria

- **`tests/mcp/useFigmaScript.phase6.*.test.ts`** green: factories, handles, booleans.
- **`tests/integration/mcp-http.phase6.script-parity.test.ts`** green: **operations** vs **`code`** produce **equivalent** compiled design context for the harness cases (masks, booleans, strokes, text path/style ids, layout-self fields as applicable).
- **`docs/design-doc/tools-schemas.md`** updated so the script path documents the Phase-6 `figma` surface and handle semantics.
- **Parity audit closed:** no remaining `ENGINE_MATRIX` patch key for script-supported types that is only JSON-reachable unless explicitly deferred with rationale in this doc (should be none at exit).

---

## Phase 7 — Document traversal & graph ops, geometry & auto-layout sizing, assets & fonts, node factories

### Objectives

Implement **Figma Design–relevant** Plugin API behavior that was previously absent: **tree traversal and graph-level mutations**, **layout / constraints / sizing parity** with Figma’s auto-layout child model, **boolean combine helpers** beyond minimal `BOOLEAN_OPERATION` authoring, **fonts** and **images** (`figma` “Other” section subset), and **additional node factories** from [figma.md § Nodes](../figma-plugin-api/docs/plugins/api/figma.md). Deliverables must be wired through **`use_figma` script (`code`)**, **`operations`**, and the **engine/compiler/metadata** so agents never depend on a “JSON-only” secret path.

### Plugin API / docs checklist (nothing missed)

| Area | APIs / concepts (reference) | Implementation notes |
|------|-----------------------------|------------------------|
| **Traversal** | `getNodeById` / `getNodeByIdAsync` (if not already complete in Phase 6, extend); `DocumentNode` / `PageNode` **findAll**, **findOne**, **findAllWithCriteria**; optional **`loadAllPagesAsync`** (no-op or full load—**document** behavior; align with `documentAccess: dynamic-page` semantics only if you introduce lazy pages). | Implement on `figma.root` and pages; criteria matcher subset must match Figma’s documented criteria shapes or throw **`VALIDATION_ERROR`** with stable messages. |
| **Selection** | `figma.currentPage.selection` read/write; `readonly` mixed selection rules; `figma.currentPage` setter where applicable. | Selection is **in-memory** only unless persisted in envelope—**decide and document** (recommend: persist optional `selectionByPageId` in `FileEnvelope` or ephemeral-only; tests lock choice). |
| **Node graph mutations** | `node.remove()`, `insertChild`, `insertBefore`, `appendChild`/`prepend` ordering, `clone` (if in scope), **`figma.group`**, **`figma.ungroup`**, **`figma.flatten`**, **`figma.transformGroup`** (modifiers subset per typings). | Map **group** to Figma semantics: either introduce a **`GROUP`** node type in model + matrix + compiler **or** document mapping to **`TRANSFORM_GROUP`** / `FRAME` with explicit differences from Figma **group** auto-resize; **ungroup** / **flatten** must round-trip without orphan ids. Queue ops in one transaction per script batch. |
| **Boolean helpers** | `union`, `subtract`, `intersect`, `exclude` (already started Phase 6—**complete** parity with operand reparenting, z-order, and **flatten** output as `VECTOR` where Figma returns vector). | Align engine rules with Figma order of operands; compiler warnings for simplified ops must be **enumerated**; add tests for each op + **flatten**. |
| **Auto-layout child sizing** | `layoutSizingHorizontal`, `layoutSizingVertical`, `layoutPositioning`; frame `primaryAxisSizingMode`, `counterAxisSizingMode` (HUG / FIXED / FILL semantics per typings). | Extend **`types.ts`**, **`phase-matrix.ts`**, **layout resolver** (`DocumentEngine` / layout module), and **DesignCompiler** flex child rules; update **`ENGINE_MATRIX`** patch + create keys. |
| **Layout / geometry** | **Constraints** (`LayoutConstraint` horizontal/vertical: `MIN`/`CENTER`/`MAX`/`STRETCH`/`SCALE` subset as supported); **`relativeTransform`** / **`absoluteTransform`** (at minimum **read** for agents; **write** via assignments Figma allows on node mixins—**no** `relaunchData`); **`resizeWithoutConstraints`** on nodes that expose it in the typings. | Persist constraints on nodes where Figma attaches them; compiler maps to **percentage** or **absolute** CSS per binding doc; document unsupported constraint combos as errors vs silent clamp. |
| **Fonts** | `listAvailableFontsAsync`, `loadFontAsync`, `hasMissingFont`. | **No Figma cloud font list:** implement deterministic catalog (bundled font manifest + optional OS discovery behind flag) and **`loadFontAsync`** that registers face for Playwright screenshot + design context; `hasMissingFont` derives from `TEXT` nodes vs loaded set. |
| **Images** | `createImage` (bytes), `createImageAsync` (src string—**gated network**), `getImageByHash`; **`figma.base64Encode`**, **`figma.base64Decode`**. | Wire `Image` handle type in script; integrate with existing **`AssetRegistry`**; **`createImageAsync`**: reject by default unless host policy allows; SSRF-safe fetcher. |
| **Sandbox globals** | Plugin global **`fetch`** (same policy as `createImageAsync`). | Optional `fetch` in `AsyncFunction` scope or `figma` namespace per security review. |
| **Node factories (Design)** | `createSlice`, `createSection`, `createTextPath`, **`createAutoLayout`** (MCP parity: frame with layout preset), **`createNodeFromSvg`** (bounded SVG import), **`createPageDivider`** / `isPageDivider` on page, any **`create*`** still missing for Design that Phase 6 did not add. | **Exclude** FigJam-only (`createSticky`, `createConnector`, `createTable` origin note: Figma marks table as FigJam in docs—**if** product keeps `TABLE` for Design agents, document dual semantics). **Exclude** Slides/Buzz (`createSlide`, …). |

### Code artifacts (representative)

| Area | Add/change |
|------|------------|
| `src/model/types.ts` | New fields: constraints, layout sizing modes, new node types **`SLICE`**, **`SECTION`** (and **`GROUP`** if chosen), `isPageDivider`, image/font-related DTOs as needed. |
| `src/engine/DocumentEngine.ts` | Validation + transactions for new fields/nodes; graph operations for group/ungroup/flatten; selection persistence if chosen. |
| `src/engine/phase-matrix.ts` | Allowlists for new properties and parent/child pairs. |
| `src/layout/*` (or engine submodules) | Resolver support for FILL/HUG/FIXED on children + `layoutPositioning` (`ABSOLUTE` vs auto-layout). |
| `src/render/DesignCompiler.ts` | CSS for constraints + sizing; slice/section semantics (export box, named region). |
| `src/mcp/useFigmaScript.ts` | Expose all Phase-7 `figma` members; `Image` type stubs with `getBytesAsync` if matching Figma surface. |
| `src/mcp/metadata.ts` / `get_metadata` | Surface constraints, sizing modes, selection (if persisted), new node types. |
| `docs/figma-plugin-api/...` | Cross-link implemented subset vs full typings (optional tracking table). |

### Test plan

| Layer | Tests |
|-------|--------|
| **A — Engine / layout** | `tests/layout/phase7-constraints-sizing.test.ts`: matrices for HUG/FILL/FIXED + absolute children; golden small trees. |
| **B — Graph ops** | `tests/engine/phase7-group-flatten-boolean.test.ts`: group → ungroup id stability; flatten produces vector path data. |
| **C — Fonts / images** | `tests/fonts/load-font-async.test.ts`, `tests/images/create-image-async.policy.test.ts` (default deny URL; allowlist pass). |
| **D — Compiler** | Snapshots for constrained child + `layoutSizingHorizontal: FILL` etc.; SVG import smoke (`createNodeFromSvg`). |
| **E — MCP** | `tests/integration/mcp-http.phase7.traversal-layout-assets.test.ts`: script uses `findAll` + `loadFontAsync` + `createImage` + `createAutoLayout` + constrained child; `get_design_context` + `get_screenshot` stable vs operations path. |

### Manual verification

1. Script: `findAll` with criteria → same count as `get_metadata` walk for fixture.
2. Auto-layout row: one child `FILL` / one `HUG` — screenshot matches Figma reference PNG (if kept) or internal golden.
3. URL image import with policy **off** → error; policy **on** + allowlisted host → hash stored.

### Exit criteria

- Checklist table in this section **100%** either implemented or explicitly **“Deferred”** with issue link in repo (no silent skips).
- New **`tests/document-model.phase7.test.mjs`** (or extend phase validator) for fixtures including constraints + sizing.
- Integration test **`mcp-http.phase7.*`** green.

---

## Phase 8 — Variables API & local styles API (create / list / reorder)

### Objectives

Expose **`figma.variables`** and **local styles** APIs matching Figma’s **local file** behavior: CRUD for variable collections, modes, variables, aliases where applicable; binding variables to supported node fields; **paint / text / effect / grid** styles creation, listing, and **reorder** APIs. Persist in **`FileEnvelope`** (extend schema as needed) with migration from Phase-5 “registry-only” shape if required.

### Plugin API / docs checklist (nothing missed)

| Area | APIs (reference: `figma-variables.md`, `figma.md` § Styles) | Notes |
|------|-------------------------------------------------------------|--------|
| **Variables — read** | `getLocalVariableCollectionsAsync`, `variables.getVariableById`, `getVariableCollectionById`, mode listing, resolved values for active mode. | Async/sync pairs per Figma: implement **async** forms; optional sync aliases that throw if `dynamic-page` not modeled. |
| **Variables — write** | `createVariableCollection`, `createVariable`, `createVariableMode`, `renameVariable` / `setVariableCodeSyntax` (if in typings), `deleteVariable`, `setBoundVariable` on paints / fields Figma allows; **variable aliases** if in API. | Enforce referential integrity; transactional batch. |
| **Variables — bind** | Extend beyond `VARIABLE_COLOR`: **FLOAT** / **STRING** bindings where compiler + model support (text, spacing tokens, etc.). | Each binding site needs matrix + compiler + metadata. |
| **Variables — excluded** | `importVariableByKeyAsync` (**remote**). | **Stub** that throws `not supported` or omit from `figma.variables` (document in README). |
| **Styles — create** | `createPaintStyle`, `createTextStyle`, `createEffectStyle`, `createGridStyle`. | Styles stored in envelope registries with stable ids; default props per Figma defaults where specified. |
| **Styles — read** | `getLocalPaintStylesAsync`, `getLocalTextStylesAsync`, `getLocalEffectStylesAsync`, `getLocalGridStylesAsync`, `getStyleByIdAsync` (+ deprecated sync variants policy). | Deterministic sort order (tie-break documented). |
| **Styles — reorder** | `moveLocalPaintStyleAfter`, `moveLocalTextStyleAfter`, `moveLocalEffectStyleAfter`, `moveLocalGridStyleAfter`, folder move APIs (`moveLocalPaintFolderAfter`, …). | Implement folder string semantics per Figma docs or reject unsupported nesting with clear errors. |
| **MCP alignment** | `get_variable_defs`, `search_design_system` stay consistent with new variable/style records (no duplicate truths). | Update payloads if collection shape changes. |

### Code artifacts

| Area | Add/change |
|------|------------|
| `src/variables/*` | Full `VariablesAPI` shim: collection/mode/variable lifecycle; resolution for compile. |
| `src/styles/*` (new) | Style CRUD + ordering; bridge to `FileEnvelope` paint/text/effect/grid style registries. |
| `src/mcp/useFigmaScript.ts` | `figma.variables = { … }`; style functions on `figma` global per docs. |
| `src/model/types.ts` | Variable aliases, style folders, extended bound fields if needed. |
| Persistence | Schema version bump + migrator from older files. |

### Test plan

| Layer | Tests |
|-------|--------|
| **A** | `tests/variables/phase8-crud.test.ts`: create collection → mode → variable → bind → delete with stable errors. |
| **B** | `tests/styles/phase8-reorder.test.ts`: create three paint styles; reorder; list order matches. |
| **C** | Compiler snapshots: bound float/string visible in CSS where supported. |
| **D** | `tests/integration/mcp-http.phase8.variables-styles.test.ts`: script-only workflow + `get_variable_defs` snapshot parity. |

### Exit criteria

- **`figma.variables`** object present with **all local** methods from checklist implemented or explicitly excluded with **runtime error** documenting exclusion.
- Style **create/list/reorder** complete for four style kinds in scope.
- **`tests/document-model.phase8.test.mjs`** (fixtures) + integration test green.

---

## Phase 9 — Components as first-class graph nodes

### Objectives

Move from **library-only** component definitions (`FileEnvelope.components[]` + `COMPONENT_INSTANCE`) toward **Figma-parity component graph**: **`COMPONENT`**, **`COMPONENT_SET`**, and **`INSTANCE`** (or aligned naming) as **scene nodes**; **`createComponent`**, **`createComponentFromNode`**, **`combineAsVariants`**; instance **`swapComponent`**, **`mainComponent`**, **`variantProperties`**; master deletion rules, nested instances, and compiler expansion reading **masters from the graph** (not only detached definitions).

### Plugin API / docs checklist (nothing missed)

| Area | APIs / behaviors | Notes |
|------|------------------|--------|
| **Types in graph** | `ComponentNode`, `ComponentSetNode`, `InstanceNode` per typings; variant **`componentPropertyDefinitions`** / **`componentPropertyReferences`** subset as needed. | Decide mapping to existing `COMPONENT_INSTANCE` vs rename types in `.hfc.json` — **migration** required. |
| **Create** | `createComponent`, `createComponentFromNode`, `combineAsVariants`. | `createComponentFromNode` preserves children + props; **combineAsVariants** requires homogeneous components → set. |
| **Instances** | `createInstance` / `figma.createComponentInstance` alignment; **`swapComponent`**; **`detachInstance`**; overrides map keyed by **exposed subtree node ids** stable across variants. | Harmonize with Phase 5 overrides model; document id stability rules when extracting variant. |
| **Main / library** | `mainComponent` getter, remote **key** (`key` field) — **local-only**: key may be synthetic ULID/string not registered with Figma cloud. | Do not implement cloud **publish**; document. |
| **Excluded** | `importComponentByKeyAsync`, `importComponentSetByKeyAsync` (remote). | Same as variables: stub or omit. |
| **Compiler / metadata** | `get_design_context` expands instances from **on-canvas** masters; `get_metadata` reports component metadata. | Golden updates for phase-5 demos after migration. |

### Code artifacts

| Area | Add/change |
|------|------------|
| `src/model/types.ts` | Graph-native component types; deprecate or alias envelope-only `components[]` (migrator copies masters into graph hidden page or explicit **component page** convention—**pick one** and document in `data-model.md`). |
| `src/engine/DocumentEngine.ts` | CRUD + matrix rules for COMPONENT/SET/INSTANCE; validation for variant combine. |
| `src/render/DesignCompiler.ts` | Expansion from graph masters; variant property switching. |
| `src/mcp/useFigmaScript.ts` | All component-related `figma` factories + node class methods. |
| `docs/design-doc/data-model.md` | Authoritative migration + graph layout for masters. |

### Test plan

| Layer | Tests |
|-------|--------|
| **A** | `tests/engine/phase9-component-crud.test.ts`: createComponent → instance → swap → detach. |
| **B** | `tests/engine/phase9-combine-variants.test.ts`: two components → set with variant props. |
| **C** | `tests/compiler/component-graph.snapshot.test.ts`: expansion matches masters on canvas. |
| **D** | `tests/integration/mcp-http.phase9.components-graph.test.ts`: end-to-end script build + screenshot vs golden. |
| **E** | Migration test: load Phase-5 fixture → migrator → equivalent `get_design_context` (normalized). |

### Exit criteria

- No **orphan** masters: deleting component cleans instances per Figma rules (**document** detach/delete policy).
- **`tests/integration/mcp-http.phase5.design-system.test.ts`** updated or superseded so CI still covers design-system flows on new graph model.
- README + `data-model.md` describe **local** component keys vs Figma cloud.

---

## Cross-phase regression policy

CI should run the full integration suite (including prior-phase smoke tests, richer design-context tests, and **Phases 7–9** parity tests once they exist) on every change. Delivery phases describe what to build next, not a runtime capability switch; do not gate tests on a `PHASE` env var.

## Related documents

- [Document engine](./document-engine.md)
- [Rendering pipeline](./rendering-pipeline.md)
- [Testing](./testing.md)
