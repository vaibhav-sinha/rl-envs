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
