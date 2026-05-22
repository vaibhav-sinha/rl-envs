# Tests (headless-figma-clone)

## Running Layer A (no build)

From repository root (or this folder):

```bash
node --test libs/headless-figma-clone/tests/document-model.phase1.test.mjs
```

## Layout

- `fixtures/` — JSON fixtures referenced by design docs and validators.
- `document-model.phase1.test.mjs` — structural validation only; does not start servers.

TypeScript integration tests are specified in [design-doc/implementation-plan-phases.md](../docs/design-doc/implementation-plan-phases.md) and land with `package.json`.

## Memory benchmarks (oker I1538 clone)

Requires `npm run build` and the oker task fixture at `envs/figma-design/tasks/oker-create-max-otp-screen/environment/design.hfc.json`.

```bash
cd libs/headless-figma-clone
npm run build
npm run benchmark:i1538        # peak heap profile (expose-gc recommended)
npm run benchmark:i1538-512    # must complete without OOM at 512MB heap
```

Vitest: `tests/integration/oker-i1538-clone.test.ts` asserts `commitEnvelope` on the same clone script.

### MCP memory (oker + subtree assets)

`tests/integration/mcp-http.oker-max-otp-server-break.test.ts` — agent clone stays up at 512MB/2048MB with `HFC_PREVIEW_ON_LOAD=0` and subtree-scoped image loading. Both describes copy the oker fixture into a temp workspace so `use_figma` never writes the task `environment/design.hfc.json`.

`tests/integration/preview-on-load.test.ts` — `--file` startup at 512MB with assets when preview compile is skipped.
