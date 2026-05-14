# Automated testing strategy

[← Design index](./index.md) · [Implementation plan](./implementation-plan-phases.md)

## Test layers

| Layer | Runner | Purpose |
|-------|--------|---------|
| A. Pure validators | `node:test` (zero build) | JSON fixtures conform to schema rules per phase |
| B. Unit tests | `vitest` (**Should** once package exists) | `DocumentEngine`, patch whitelists, ID allocation |
| C. Compiler snapshots | `vitest` + string snapshot | Deterministic HTML/CSS |
| D. Screenshot golden | `vitest` + Playwright + `pixelmatch` | PNG threshold compare |
| E. HTTP MCP integration | `vitest` + `@modelcontextprotocol/sdk` client | End-to-end tool calls against `POST /mcp` |

**Binding for repo bootstrap:** ship **Layer A** immediately under `libs/headless-figma-clone/tests/` so CI can run `node --test` without TypeScript build. Layers B–E become **required** once `package.json` exists (Phase 1 completion criterion).

```bash
node --test libs/headless-figma-clone/tests/document-model.phase1.test.mjs
```

## Fixture locations

- `libs/headless-figma-clone/tests/fixtures/` — JSON files named `phase{N}-*.json`.

## Golden screenshot policy

- Store baselines under `tests/golden/*.png`.
- CI uses pinned Playwright browser build; local dev may differ — allow threshold `<= 0.15%` differing pixels OR update baseline via documented script.

## Required tests mapping to NFR-TEST-001

| NFR | Test |
|-----|------|
| save/load round-trip | `DocumentEngine` + temp dir: mutate → save → new engine load → deep equals |
| `use_figma` create frame + style | integration test calls tool |
| `get_metadata` shape | assert JSON schema subset |
| `get_design_context` non-empty | `expect(html.includes('<div'))` etc. |

## Manual testing

See [Implementation plan — manual MCP harness](./implementation-plan-phases.md#manual-mcp-harness).

## Related documents

- [HTTP host](./http-host.md)
- [Tools schemas](./tools-schemas.md)
