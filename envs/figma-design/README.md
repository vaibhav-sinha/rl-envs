# metaphi/figma-design

Harbor dataset for Figma design RL and evaluation. Each trial runs in a **single container** with the agent, RewardKit verifier, and a **Figma** MCP server (Streamable HTTP on port 3847). The MCP process starts automatically via the shared entrypoint.

## Architecture

```text
metaphi/figma-design-base:latest     # HFC + Playwright + entrypoint (build once)
        │
        ▼
per-task image                       # + design + assets (~seconds to build)
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
| Agent task assets | `environment/assets/` → `/app/assets/` |
| Verifier baseline design | Baked at build as `/tests/design.initial.hfc.json` |
| Verifier current design | `/data/workspace/design.hfc.json` (MCP-saved after agent) |
| Verifier | RewardKit under `/tests` |
| Post-trial design snapshot | `jobs/.../<trial>/artifacts/design.hfc.json` on the host |

## Layout

```text
envs/figma-design/
├── agents/                    # custom Harbor agents (e.g. cursor-cli + skills)
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
        │   ├── Dockerfile               # FROM base + COPY design, assets, baseline
        │   ├── design.hfc.json          # starting design (single source of truth)
        │   ├── design.hfc.assets/       # optional HFC bitmap sidecar (if fixture uses one)
        │   └── assets/                  # reference files for the agent → /app/assets/
        └── tests/
            ├── check.py              # RewardKit → figma_eval (Python)
            ├── figma_eval/           # grading engine (incl. LiteLLM visual judge)
            ├── test.sh
            └── eval-spec.json        # task grading spec (optional; preserved on sync)
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

# optional: pre-install cursor-agent (faster Cursor CLI trials)
node envs/figma-design/scripts/build-base.mjs --with-cursor-cli
```

This produces `metaphi/figma-design-base:latest` with headless-figma-clone, Playwright Chromium, `curl`, and `uv`. Pass `--with-cursor-cli` (or set `FIGMA_DESIGN_INSTALL_CURSOR_CLI=1`) to bake in `cursor-agent`.

## Add a task

```bash
node envs/figma-design/scripts/new-task.mjs my-task-id

# optional: custom fixture and starter eval-spec
node envs/figma-design/scripts/new-task.mjs my-task-id \
  --fixture libs/headless-figma-clone/tests/fixtures/phase2-compile-harness.hfc.json \
  --eval-spec

cd envs/figma-design
harbor add tasks/my-task-id
```

Edit `tasks/my-task-id/instruction.md`, then rebuild only the thin task layer (Harbor does this on `harbor run`). New tasks from `new-task.mjs` and the Task Builder include the standard MCP-only preamble from `shared/instruction-preamble.txt` at the top of every instruction; keep that line when editing tasks.

### Task assets and design baseline

Each task image copies:

- `environment/design.hfc.json` → `/data/workspace/design.hfc.json` (mutable; HFC MCP loads and saves here)
- the same file → `/tests/design.initial.hfc.json` (immutable baseline for verifiers)
- `environment/assets/` → `/app/assets/` (reference PNGs, copy, etc. for the agent)

If the fixture has a sibling `*.hfc.assets/` directory (embedded bitmaps), `new-task.mjs` copies it into `environment/` and adds a `COPY` into `/data/workspace/`.

Mention agent assets in `instruction.md` as `/app/assets/<file>`. Agents typically use `upload_assets` with `filePath` relative to cwd `/app`.

Grading is defined in `tests/eval-spec.json` (schema: `shared/verifier/eval-spec.schema.json`). The verifier runs the Python `figma_eval` package in-process; screenshots use the HFC core CLI.

### Scoring model

RewardKit exposes a single criterion `figma_design_score` ∈ [0, 1] (`score_0_10 / 10`). The engine computes:

```text
final_0_10 = clamp(0, 10, completion_gate × raw × 10)
```

**`completion_gate`** (hard caps; gates are not averaged into `raw`):

| Failure | Multiplier |
|---------|------------|
| Any applicable gate with score &lt; 1 | × 0.2 |
| Any applicable **required** structural check with score &lt; 1 | × 0.3 |

Gates (`require_change`, `preserve_ids`, `allowed_change_inside_ids`, `additions_only`, `no_detached_nodes`) only affect `completion_gate`. Optional structural checks use `"required": false` and do not trigger the 0.3 cap.

**`raw`** (quality score, 0–1): weighted mean of **category means** for categories that have at least one applicable subcheck:

`commands`, `checks`, `design_system`, `visual`, `heuristics`, `metadata`.

Per-task **`category_importance`** sets relative priority (e.g. upweight `visual` on layout tasks). Values are **normalized internally** over categories that actually ran, so authors can use arbitrary positive numbers. Legacy `weights` in old specs is still read but `gates` entries are ignored for `raw`.

Within each category, subchecks are combined with a **weighted mean**; each check/visual/metadata entry may set `"weight"` (default **1.0**).

**Heuristics** (always-on when content changed): contrast uses the **minimum** contrast ratio across text nodes; readable font size uses the **minimum** per-text pass score (any text &lt; 10px fails that subcheck).

Full per-subcheck breakdown: `/logs/verifier/eval-report-details.json`.

**Visual checks** (LLM + screenshots): `good_design`, `design_consistency`, `design_fit`, `task_completeness`, `design_preference`.

**Metadata checks** (LLM, no screenshots): e.g. `diff` under `metadata_checks`.

```bash
node /opt/hfc/dist/cli.js render --file <path.hfc.json> --node <id> --out <png>
```

Local debugging:

```bash
cd envs/figma-design/shared/verifier
pip install -r requirements.txt jsonschema
PYTHONPATH=. python -m figma_eval.cli run --before ... --after ... --spec ... --report /tmp/report.json
```

If `eval-spec.json` is missing, the criterion returns a perfect score (useful only while scaffolding).

## Sync shared tests to existing tasks

After changing `shared/verifier/`, push updates to all tasks (keeps each task's `tests/eval-spec.json` if present):

```bash
node envs/figma-design/scripts/sync-tests.mjs

# or specific tasks only
node envs/figma-design/scripts/sync-tests.mjs hello-frame with-metadata
```

This replaces each task's `tests/` with `shared/verifier/`, then restores `eval-spec.json` when it existed.

## Verifier (RewardKit)

Single criterion `figma_design_score` in `shared/verifier/check.py` calls `figma_eval.run_eval()`. See **Scoring model** above; details land in `/logs/verifier/eval-report-details.json`.

`tests/test.sh` runs:

```bash
uvx --from 'harbor-rewardkit==0.1.*' rewardkit /tests
```

Output: `/logs/verifier/reward.json`.

### Post-trial design artifact

After grading, `tests/test.sh` copies the agent’s final design to `/logs/artifacts/design.hfc.json`.
HFC also writes `/data/workspace/issues.hfc.json` (appended across `use_figma` calls) when
relevant; when present it is copied to `/logs/artifacts/issues.hfc.json`. The file may contain:

- `detached` — nodes created in a script but never appended to the document
- `commands` — one entry per `use_figma` call with `success: true|false` (compile/runtime/transaction errors set `success` to false)

Harbor bind-mounts `/logs/artifacts` to the host trial directory, so you get:

```text
jobs/<job>/<trial>/artifacts/design.hfc.json
jobs/<job>/<trial>/artifacts/issues.hfc.json   # when issues were recorded
```

Tasks also declare `[[artifacts]]` in `task.toml` so Harbor downloads the same paths when
collection runs outside the mounted layout. Inspect `design.hfc.json` to debug structural checks
(for example `must_contain_text` with `scope: "new_frames"`). Inspect `issues.hfc.json` to see
detached node snapshots (`no_detached_nodes` gate) or `use_figma` command outcomes
(`commands.command_correctness` subcheck: success/total, capped at 0.8 when any command failed).

## Agent skills

Tasks can ship skills for agents that support them:

1. Add skill folders under `shared/skills/` (copied into the base image at `/skills/`).
2. Set `skills_dir = "/skills"` in `task.toml` under `[environment]`.
3. In a custom installed agent, implement `_build_register_skills_command()` to copy from `self.skills_dir` into the CLI’s skills location, and run that command in `run()` before launching the agent. See [Harbor PR #911](https://github.com/harbor-framework/harbor/pull/911) and upstream `ClaudeCode` for the pattern. For Cursor CLI, copy into `.cursor/skills/` in the workdir (`/app`).

## Pre-installed agents (faster runs)

Upstream `cursor-cli` installs `cursor-agent` on every trial. To skip that step:

1. Build the base image with Cursor CLI: `node envs/figma-design/scripts/build-base.mjs --with-cursor-cli`
2. Use the local agent (`install()` is a no-op) via `--agent-import-path`.

From the repository root (set `CURSOR_API_KEY` on the host):

```powershell
$env:PYTHONPATH = "envs/figma-design"
$env:CURSOR_API_KEY = "<key>"
harbor run -p envs/figma-design/tasks/hello-frame --env docker `
  --agent-import-path agents.cursor_cli:CursorCliWithSkills `
  -m cursor/auto
```

## Running

Build the base image, then:

```bash
# Single task
harbor run -p envs/figma-design/tasks/hello-frame --env docker -a terminus-2 -m anthropic/claude-sonnet-4-6

# Full dataset
harbor run -p envs/figma-design --env docker -a terminus-2 -m anthropic/claude-sonnet-4-6

# Cursor CLI with skills (requires --with-cursor-cli base build; see Pre-installed agents)
# harbor run ... --agent-import-path agents.cursor_cli:CursorCliWithSkills -m cursor/auto

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
| `with-metadata` | Rename `Board` → `MainBoard`; graded via `tests/eval-spec.json` |

## Pitfalls

- **Docker not running** — base and task builds fail immediately.
- **`FROM metaphi/figma-design-base:latest` missing** — run `build-base.mjs` first.
- **`.hfc` without `.json`** — engine requires `*.hfc.json`.
- **MCP URL hostname** — must be `127.0.0.1` in single-container setup, not a Compose service name.
- **Changed `design.hfc.json`** — rebuild the task image; baseline is baked at build time.
