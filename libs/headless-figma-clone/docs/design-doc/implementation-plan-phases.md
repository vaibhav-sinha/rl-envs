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
- `fills` / `strokes`: max **8** paints each (soft cap) to prevent abuse; exceed → `VALIDATION_ERROR`.

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

### Automated tests

| Test | Assertion |
|------|-----------|
| `tests/compiler/text-ranges.snapshot.test.ts` | snapshot HTML for mixed spans + link |
| `tests/compiler/frame-background-clip.test.ts` | CSS contains `overflow:hidden` when `clipsContent` |
| `tests/engine/utf16-segments.test.ts` | invalid overlapping segments rejected |

### Manual verification

1. MCP: create `FRAME` with `backgrounds` + nested rotated `TEXT` with hyperlink span.
2. `get_screenshot` visual check in any image viewer: shadow visible, clipping works.

### Exit criteria

- PRD Phase 2 roadmap exit: “Frame with background + clipped child + rotated sibling + rich title + shadow” covered by golden PNG test.

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

Every phase adds **at least one** integration test that replays all prior phase smoke tests in a merged suite `tests/integration/regression.all-phases.test.ts` gated by `PHASE>=N` env or compile-time constant.

## Related documents

- [Document engine](./document-engine.md)
- [Rendering pipeline](./rendering-pipeline.md)
- [Testing](./testing.md)
