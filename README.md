# rl-envs

Reinforcement-learning and evaluation environments built on [Harbor](https://www.harborframework.com/).

## Environments

| Path | Description |
|------|-------------|
| [`envs/figma-design/`](envs/figma-design/README.md) | Figma design tasks with MCP agent + RewardKit verifier |

## Development

See [`envs/figma-design/README.md`](envs/figma-design/README.md) for architecture, prerequisites, building the Docker base image, and running tasks locally.

Host tools (from repo root):

```bash
pip install -r requirements.txt
git lfs pull   # required before building/running — designs are stored in LFS
node envs/figma-design/scripts/build-base.mjs
harbor run -p envs/figma-design/tasks/oker-create-order-details-screen --env docker -a terminus-2 -m anthropic/claude-sonnet-4-6
```

## External distribution

To ship the figma-design environment to others as a self-contained zip (no Git history, no dev-only libs, prebuilt HFC):

```bash
node scripts/package-figma-design-release.mjs
```

This writes `releases/figma-design-eval-<date>.zip`. Options:

| Flag | Purpose |
|------|---------|
| `--output <path>` | Custom zip path |
| `--dry-run` | Validate designs and list tasks without creating the zip |
| `--skip-hfc-build` | Skip `npm ci && npm run build` in `libs/headless-figma-clone` (use when dist is already fresh) |

**Before packaging**, ensure Git LFS design files are materialized on disk:

```bash
git lfs pull
```

The script fails if any `designs/*/design.hfc.json` is still an LFS pointer.

### What the zip contains

- `envs/figma-design/` — tasks, designs, verifiers, skills, runtime scripts
- `libs/headless-figma-clone/` — prebuilt `dist/` and bundled `fonts/` only
- `requirements.txt` and a distribution `README.md` for recipients

Excluded: `atif-viewer`, `figma-task-builder`, `local-figma-mcp`, HFC source/tests, Git metadata, and authoring scripts.

Recipients unpack, build the base Docker image, set API keys, and run Harbor — see the README inside the zip.
