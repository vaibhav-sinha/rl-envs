# metaphi/figma-design

Harbor dataset for Figma design RL and evaluation. Each trial runs in a **single container** with the agent, RewardKit verifier, and a **Figma** MCP server (Streamable HTTP on port 3847). The MCP process starts automatically via the shared entrypoint.

## Architecture

```text
metaphi/figma-design-base:latest     # HFC + Playwright + entrypoint (build once)
        │
        ▼
per-task image                       # + design.hfc.json only (~seconds to build)
        │
        ▼
container start → entrypoint → MCP /health ready → agent → verifier
```

| Component | Location |
|-----------|----------|
| MCP server name | `Figma` (`task.toml` → `[[environment.mcp_servers]]`) |
| MCP URL | `http://127.0.0.1:3847/mcp` |
| Design at startup | Loaded automatically via `HFC_INITIAL_FILE` (not mentioned to agents) |
| Agent workdir | `/app` |
| Verifier | RewardKit under `/tests` |

## Layout

```text
envs/figma-design/
├── dataset.toml
├── shared/
│   ├── environment/
│   │   ├── Dockerfile.base
│   │   └── entrypoint.sh
│   └── verifier/              # copied into each task's tests/
├── scripts/
│   ├── build-base.mjs
│   └── new-task.mjs
└── tasks/
    └── <task-id>/
        ├── instruction.md
        ├── task.toml
        ├── environment/
        │   ├── Dockerfile               # FROM base + COPY design
        │   └── design.hfc.json          # starting design (Docker build context)
        └── tests/
```

Tasks intentionally have **no** `solution/` directory (RL / agent-only eval).

## Prerequisites

- Docker Desktop (or Docker Engine) running
- [Harbor](https://www.harborframework.com/) CLI: `pip install harbor` or `uv tool install harbor`
- Node 20+ (only for local HFC development; the image builds HFC inside Docker)

## Build the base image

From the repository root (first time, or when `libs/headless-figma-clone` changes):

```bash
node envs/figma-design/scripts/build-base.mjs
```

This produces `metaphi/figma-design-base:latest` with headless-figma-clone, Playwright Chromium, `curl`, and `uv`.

## Add a task

```bash
node envs/figma-design/scripts/new-task.mjs my-task-id

# optional: custom fixture and metadata stub
node envs/figma-design/scripts/new-task.mjs my-task-id \
  --fixture libs/headless-figma-clone/tests/fixtures/phase2-compile-harness.hfc.json \
  --with-metadata

cd envs/figma-design
harbor add tasks/my-task-id
```

Edit `tasks/my-task-id/instruction.md`, then rebuild only the thin task layer (Harbor does this on `harbor run`).

## Sync shared tests to existing tasks

After changing `shared/verifier/`, push updates to all tasks (keeps each task's `tests/design-metadata.json` if present):

```bash
node envs/figma-design/scripts/sync-tests.mjs

# or specific tasks only
node envs/figma-design/scripts/sync-tests.mjs hello-frame with-metadata
```

This deletes everything under each task's `tests/` except `design-metadata.json`, then copies `shared/verifier/` again.

## Verifier (RewardKit)

Shared criteria under `shared/verifier/`:

| Reward key | Weight | Type | Description |
|------------|--------|------|-------------|
| `dummy_minor` | 0.2 | programmatic | Placeholder (always passes) |
| `dummy_primary` | 0.8 | programmatic | Placeholder (always passes) |
| `metadata` | 1.0 | programmatic | Reads `/tests/design-metadata.json` if present; skips when absent |

`tests/test.sh` runs:

```bash
uvx --from 'harbor-rewardkit==0.1.*' rewardkit /tests
```

Output: `/logs/verifier/reward.json`.

## Running

Build the base image, then:

```bash
# Single task
harbor run -p envs/figma-design/tasks/hello-frame --env docker -a terminus-2 -m anthropic/claude-sonnet-4-6

# Full dataset
harbor run -p envs/figma-design --env docker -a terminus-2 -m anthropic/claude-sonnet-4-6

# Interactive shell (MCP should already be up)
harbor task start-env -p envs/figma-design/tasks/hello-frame --env docker -a -i
curl -sf http://127.0.0.1:3847/health
```

## RL training

Use Harbor `TaskConfig` with local paths ([RL workflow](https://www.harborframework.com/docs/training-workflows/rl)):

```python
TaskConfig(path="envs/figma-design/tasks/hello-frame")
# or dataset trials from envs/figma-design
```

Single-container tasks work with standard Docker environments (including many cloud sandboxes). Rebuild `metaphi/figma-design-base:latest` when the HFC library changes; per-task images stay fast.

## Example tasks

| Task | Description |
|------|-------------|
| `hello-frame` | Add a `Hello` frame via Figma MCP |
| `with-metadata` | Rename `Board` → `MainBoard`; includes `tests/design-metadata.json` |

## Pitfalls

- **Docker not running** — base and task builds fail immediately.
- **`FROM metaphi/figma-design-base:latest` missing** — run `build-base.mjs` first.
- **`.hfc` without `.json`** — engine requires `*.hfc.json`.
- **MCP URL hostname** — must be `127.0.0.1` in single-container setup, not a Compose service name.
