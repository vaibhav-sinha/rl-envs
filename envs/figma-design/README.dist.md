# Figma Design Eval Bundle

Harbor evaluation bundle for Figma design tasks. Each trial runs in a **single Docker container** with an agent, a RewardKit verifier, and a **Figma** MCP server (HTTP on port 3847).

## What is included

- Task definitions, grading specs, and reference assets under `envs/figma-design/tasks/`
- Shared design exports under `envs/figma-design/designs/`
- Verifier engine and agent skills under `envs/figma-design/shared/`
- Prebuilt headless-figma-clone runtime under `libs/headless-figma-clone/` (`dist/` + bundled fonts)

This bundle does **not** include Git history, authoring tools (Task Builder, local Figma MCP), or the ATIF trajectory viewer.

## Prerequisites

| Tool | Purpose |
|------|---------|
| **Docker Desktop** or **Docker Engine** | Runs trials in containers |
| **Harbor CLI** | Orchestrates task builds and agent runs |
| **LLM API key(s)** | Visual and metadata grading judges |

Install Harbor:

```bash
pip install -r requirements.txt
# or: uv tool install harbor
```

Node.js on the host is **not** required to run trials — the Docker image installs runtime dependencies and uses the prebuilt HFC CLI.

## Quick start

From the root of this bundle (the folder that contains `envs/` and `libs/`):

```bash
# 1. Build the shared base image (once, or after updating the bundle)
node envs/figma-design/scripts/build-base.mjs

# 2. Set API keys for visual/metadata judges
export GEMINI_API_KEY=your-key-here
# Optional if using other judge models:
# export OPENAI_API_KEY=...
# export ANTHROPIC_API_KEY=...

# 3. Run a single task
harbor run -p envs/figma-design/tasks/oker-create-order-details-screen \
  --env docker -a terminus-2 -m anthropic/claude-sonnet-4-6

# Or run the full dataset
harbor run -p envs/figma-design --env docker -a terminus-2 -m anthropic/claude-sonnet-4-6
```

### Optional: Cursor CLI agent

To use the bundled Cursor CLI agent with skills:

```bash
node envs/figma-design/scripts/build-base.mjs --with-cursor-cli
export CURSOR_API_KEY=your-key-here
export PYTHONPATH=envs/figma-design
harbor run -p envs/figma-design/tasks/oker-create-order-details-screen \
  --env docker \
  --agent-import-path agents.cursor_cli:CursorCliWithSkills \
  -m cursor/auto
```

## Environment variables

These are read from your host environment and passed into the verifier container:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes (default judge model) | LLM judges for visual/metadata checks |
| `OPENAI_API_KEY` | If using OpenAI models | LLM judges |
| `ANTHROPIC_API_KEY` | If using Anthropic models | LLM judges |
| `EVAL_JUDGE_MODEL` | No | Judge model (default: `gemini/gemini-3-flash-preview`) |

## Tasks in this bundle

{{TASK_LIST}}

## After a run: job output

Harbor writes results under `jobs/<timestamp>__<job-id>/` relative to where you ran the command:

```text
jobs/<job>/<trial-id>/
├── result.json                     # Harbor trial summary
├── agent/                          # agent logs and trajectory
├── verifier/
│   ├── reward.json                 # final RewardKit score
│   ├── eval-report.json            # category-level summary
│   ├── eval-report-details.json    # every subcheck with scores and details
│   └── screenshots/                # PNG renders used by visual judges
│       ├── good_design_1-agent.png
│       ├── design_consistency_4-agent.png
│       └── ...
└── artifacts/
    ├── design.hfc.json             # agent's final design
    └── issues.hfc.json             # detached nodes and use_figma command log (when present)
```

### Final score

The verifier exposes a single criterion `figma_design_score` in `[0, 1]` (also reported as `score_0_10 / 10` in detailed reports).

```text
final_0_10 = clamp(0, 10, completion_gate × raw × 10)
```

### Gates (hard caps)

Gates affect `completion_gate` only — they are not averaged into the quality score.

| Gate | Meaning |
|------|---------|
| `require_change` | The design must differ from the baseline |
| `preserve_ids` | Listed node IDs must remain unchanged |
| `allowed_change_inside_ids` | Only those subtrees may be modified |
| `additions_only` | No edits or deletes to existing nodes |
| `no_detached_nodes` | No nodes created but never attached to the document |

If any applicable gate scores below 1, `completion_gate` is capped at **0.2**. If any applicable **required** structural check scores below 1, it is capped at **0.3**.

### Structural checks

Defined in each task's `tests/eval-spec.json` under `checks`:

| Type | Meaning |
|------|---------|
| `must_contain_text` | Required text present in a node or in newly added frames |
| `must_contain_image` | Image fill present in a node or new frames |
| `min_added_under` | Minimum number of new children under a parent |
| `min_modified_under` | Minimum number of modified children under a parent |
| `component_instances_under` | Minimum component instances in a scope |
| `property_on_node` | A node property equals an expected value |

### Visual checks (LLM + screenshots)

Screenshots land in `verifier/screenshots/` with names matching check IDs:

| Type | Meaning |
|------|---------|
| `good_design` | General design quality of the agent's new work |
| `design_consistency` | Visual match to a reference mock and listed criteria |
| `design_fit` | Custom evaluation prompt on a specific node region |
| `task_completeness` | Whether the agent completed the task instruction |
| `design_preference` | Whether the result is closer to a reference than the baseline |

### Other scoring categories

| Category | Meaning |
|----------|---------|
| `heuristics` | Always-on checks such as contrast and minimum readable font size |
| `metadata` | LLM summary of design changes (no screenshots) |
| `commands` | Success rate of `use_figma` script calls (from `issues.hfc.json`) |
| `design_system` | Whether new components follow the existing design system |

Read `verifier/eval-report-details.json` for per-subcheck scores, weights, applicability, and judge rationale.

## Troubleshooting

- **`HealthcheckError` on MCP startup** — rebuild the base image: `node envs/figma-design/scripts/build-base.mjs`
- **`FROM metaphi/figma-design-base:latest` missing** — run `build-base.mjs` before `harbor run`
- **Zero visual scores** — confirm `GEMINI_API_KEY` (or the key for your `EVAL_JUDGE_MODEL`) is set on the host
- **Docker not running** — base and task image builds fail immediately

## Interactive debugging

```bash
harbor task start-env -p envs/figma-design/tasks/oker-create-order-details-screen --env docker -a -i
curl -sf http://127.0.0.1:3847/health
```

The agent workdir is `/app`. The live design file is `/data/workspace/design.hfc.json`.
