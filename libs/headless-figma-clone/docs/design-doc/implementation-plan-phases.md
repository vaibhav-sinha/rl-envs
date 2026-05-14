# Five-phase implementation and testing plan

[← Design index](./index.md) · [PRD phased roadmap](../prd/phased-roadmap.md)

This document is the **delivery contract**. Each phase lists **exact code artifacts**, **behavior changes**, **automated tests to add or extend**, and **manual verification** steps.

Global rules (all phases):

- No `pluginData`, Dev Mode, prototyping, video paints, remote libraries, `EMBED`, `LINK_UNFURL`.
- Mutations are **transactional**; failed batch leaves disk unchanged.
- JSON save is **atomic** ([Persistence](./persistence.md)).

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
curl -sS -X POST http://127.0.0.1:3847/debug/load-file \
  -H "content-type: application/json" \
  -d "{\"path\":\"C:\\\\tmp\\\\sample.hfc.json\"}"
```

Requires `HFC_ALLOW_DEBUG=1`.

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
| `src/server/createHttpServer.ts` | `/health`, `/mcp`, gated `/debug/load-file` |
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

Phase 1 proves the wire path with **`tests/integration/mcp-http.smoke.test.ts`**: `create_new_file` → `use_figma` **operations** → `get_metadata` → `get_design_context` → `get_screenshot`, plus a second **`use_figma`** invocation with **`skillNames` + `code`** (sandbox script) that creates a frame, then **`/debug/preview`** checks both nodes appear.

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
8. **`GET /debug/preview`** (when enabled): assert rendered HTML includes `hfc-node-` classes for nodes created in both step 2 and step 5 (same pattern as Phase 1 smoke).

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

### Automated tests

| Test | Assertion |
|------|-----------|
| `tests/assets/upload.validation.test.ts` | rejects oversize, rejects bad MIME |
| `tests/compiler/gradient.snapshot.test.ts` | CSS contains `linear-gradient` etc. |
| `tests/integration/image-fill.test.ts` | upload → reference `imageHash` → screenshot non-empty |

### Manual verification

1. Call `upload_assets` with a small PNG `dataUrl`.
2. Patch `RECTANGLE` fill `ImagePaint` referencing returned hash; screenshot shows image roughly placed.

### Exit criteria

- PRD Phase 3 checklist file passes golden integration fixture `tests/fixtures/phase3-showcase.json` (add during phase).

---

## Phase 4 — Auto layout, grids, masks, vectors, booleans

### Code artifacts

| Area | Add/change |
|------|------------|
| Engine | compile-only auto layout resolver + constraints |
| Model | `VECTOR`, `BOOLEAN_OPERATION`, `TRANSFORM_GROUP`, mask fields, layout grid fields |
| Compiler | flex/grid, svg mask/boolean, backdrop blur |

### Automated tests

| Test | Assertion |
|------|-----------|
| `tests/layout/autolayout.flexbox.snapshot.test.ts` | known flex output for small tree |
| `tests/layout/ephemeral-no-persist.test.ts` | ensures compile pass does not mutate saved JSON |
| `tests/compiler/boolean-svg.test.ts` | boolean of two rects yields `<svg>` |

### Manual verification

1. Build nav bar fixture with wrapping; inspect `get_design_context` HTML for `display:flex` and gap values matching document fields.

### Exit criteria

- PRD Phase 4 exit scenario covered by `tests/fixtures/phase4-nav-grid-mask.json` golden screenshot.

---

## Phase 5 — Variables, styles, components, tables, text path

### Code artifacts

| Area | Add/change |
|------|------------|
| Model | variables, styles, components, tables, text path |
| MCP | register `get_variable_defs`, `search_design_system` |
| Compiler | CSS variables + component expansion |

### Automated tests

| Test | Assertion |
|------|-----------|
| `tests/search/design-system.text.test.ts` | deterministic ordering for fixture queries (NFR-TEST-003) |
| `tests/variables/get-variable-defs.test.ts` | resolves bound color for active mode |

### Manual verification

1. Ask `search_design_system` query matching a component name substring; ensure ranked order stable across runs.

### Exit criteria

- Demo fixture described in PRD Phase 5 passes combined screenshot + variable defs JSON snapshot.

---

## Cross-phase regression policy

CI should run the full integration suite (including prior-phase smoke tests and richer design-context tests) on every change. Delivery phases describe what to build next, not a runtime capability switch; do not gate tests on a `PHASE` env var.

## Related documents

- [Document engine](./document-engine.md)
- [Rendering pipeline](./rendering-pipeline.md)
- [Testing](./testing.md)
