# Figma Design RL Environment

**Technical Report and Sample Submission**

*Prepared by the Metaphi Environments Team*

---

## 1. Executive Summary

This report accompanies the source code for **`metaphi/figma-design`**, an RL environment for training and evaluating LLM agents on the production discipline of UI design in Figma. It is built around three pillars that together make it a practical training ground rather than a screenshot-grading benchmark:

1. **A Figma-shaped sandbox we own end-to-end.** Our **Headless Figma Clone (HFC)** speaks the Figma Plugin API surface and exposes the same Model Context Protocol (MCP) tools that real agents use against Figma Desktop today. Tasks run inside it without any dependency on Figma cloud, accounts, or rate limits.
2. **Real designs, not synthetic stubs.** Tasks are seeded from **real Figma files ported into HFC** by SMEs, so agents see the variables, components, auto-layout, styled text segments, and structural messiness of production design systems.
3. **A rubric-and-reward system designed for RL.** Every task ships an `eval-spec.json` authored per task by SMEs. The verifier produces a **hierarchical reward**: hard gates first, then deterministic structural checks, design-system adherence, visual judgments, and accessibility heuristics, weighted per task. Each check is scoped to defeat a specific reward-hacking pattern.

The bundle includes three sample tasks (`hello-frame`, `with-metadata`, `plumby-edit-footer`) covering distinct task archetypes. The same machinery scales to hundreds of tasks via our **Figma Task Builder** plugin, where SMEs convert live Figma frames into Harbor tasks in minutes.

---

## 2. Why Figma is the Right Surface for Design RL

Figma is the de facto enterprise design surface, which makes capability gains here directly transferable to the workflows researchers care about (design-to-code, generative UI, design system maintenance):

- **~13 million monthly active users** across designers, PMs, engineers, and marketers, with two-thirds of users now non-designers — turning Figma into a cross-functional design surface, not just a designer tool ([Kleiner Perkins](https://www.kleinerperkins.com/perspectives/figma-made-design-collaborative-today-it-makes-history/), [AInvest analysis](https://www.ainvest.com/news/figma-33-billion-tam-growth-investor-playbook-market-capture-2601/)).
- **78% of the Fortune 2000** and roughly **95% of the Fortune 500** are paying customers, and Figma is in **~98% of organizations** that buy design software in 2026 ([SaaStr learnings from S-1](https://cloud.substack.com/p/5-interesting-learnings-from-figma), [Longyield analysis](https://longyield.substack.com/p/figma-the-design-empire-that-survived), [Ramp vendor data](https://ramp.com/vendors/figma)).
- **Q1 2026 revenue of $333M (+46% YoY)** with full-year guidance raised to **~$1.42–$1.43B**, and a **net dollar retention of 139%** — i.e., enterprises are not just adopting Figma, they are deepening usage, particularly around AI-assisted design ([Figma IR](https://investor.figma.com/news-events/news/news-details/2026/Figma-Announces-First-Quarter-2026-Financial-Results/default.aspx), [Q1 2026 transcript](https://www.fool.com/earnings/call-transcripts/2026/05/15/figma-fig-q1-2026-earnings-call-transcript/?source=iedfolrf0000001)).
- **MCP is the access layer for AI agents.** Figma now ships first-party Dev Mode and Remote MCP servers integrated with Claude Code, Codex, Cursor, and Gemini CLI. The Figma file is rapidly becoming a structured tool target for agents, not a static asset ([Figma Dev Mode MCP announcement](https://www.figma.com/blog/introducing-figma-mcp-server/), [Figma developer docs](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)).

> *Content from third-party sources was rephrased and summarized for licensing compliance; figures remain attributed inline.*

The implication for RL: training on Figma-shaped tasks puts an agent on the same surface its real users will operate on, with the same MCP tool vocabulary, the same node graph semantics, and the same component/variable abstractions.

---

## 3. The Figma Clone — Our Differentiator

The headline differentiator of this environment is that it does **not depend on Figma**. We ship our own Figma-shaped runtime, the **Headless Figma Clone (HFC)**, which lets a researcher spin up thousands of training trials in parallel on commodity Linux containers without authenticating against Figma, without managing teams, without rate limits, and without any cloud dependency.

### 3.1 Why a clone instead of driving real Figma

Driving real Figma for RL training is operationally untenable:

| Real Figma | Our HFC |
|---|---|
| Cloud-only, requires team & seat management | Local container, zero accounts |
| Strict per-account rate limits | Determined by your CPU |
| Plugin sandbox is single-process, single-window | Headless, parallelizable |
| State leaks across runs | Each trial gets a fresh, baked design |
| Network and login flakiness | Hermetic |
| Hard to snapshot/diff for graders | Single canonical `.hfc.json` document |

For training, the requirements are not "be Figma" — they are: **expose the same agent surface area** (Plugin API + MCP tools), **accept real Figma designs**, and **render outputs that we can deterministically compare**. HFC was scoped exactly to those goals, with everything else explicitly out of scope (multiplayer, prototyping, FigJam, video, Code Connect, the canvas editor itself).

### 3.2 Capabilities (what agents see and use)

Because the secret sauce is in *how* we built it, we will summarize *what* it provides at the surface level:

- **Figma Plugin API parity.** Agents can run `use_figma { code, description }` containing JavaScript written against the Figma Plugin API — `figma.createFrame`, auto-layout properties, variables, styles, component instances, traversal, fill/stroke/effect/grid styles, bound variables, styled text segments, and so on. This means the **same agent prompt and same code patterns** work against either Figma Desktop or our clone, and any prompt corpus or skill we build is portable.
- **Figma MCP interface.** HFC speaks Streamable HTTP MCP at `http://127.0.0.1:3847/mcp`. The toolset (`get_metadata`, `get_screenshot`, `get_design_context`, `get_variable_defs`, `search_design_system`, `use_figma`, `create_new_file`, `open_file`, …) and tool descriptions track Figma's published MCP tools and prompts so agent behavior generalizes.
- **Deterministic, single-document I/O.** Every design is a `*.hfc.json` envelope: the document tree, components, text styles, paint styles, effect styles, grid styles, variables, variable collections, and inline asset bytes. The verifier diffs two envelopes (before/after) — this is what makes scoring stable across runs.
- **Real Figma fidelity on import.** We import frames, text (with styled segments), shapes, vectors, boolean operations, groups, sections, components, instances, slices, auto-layout, constraints, pattern fills, variables and bound fields, and paint/effect/text/grid styles. Coordinates are parent-relative, matching `node.x`/`node.y` semantics in the Plugin API.
- **Pixel rendering.** A built-in `DesignCompiler` produces HTML/CSS plus Playwright-driven PNG screenshots per node, used both by `get_screenshot` for the agent and by the verifier's visual judges. We track parity against real Figma across **110 verification scenarios** spanning foundational and advanced Plugin API surfaces.
- **Fast container start.** A thin per-task image is layered on top of a prebuilt `metaphi/figma-design-base` image. New tasks build in seconds, not minutes. The MCP server starts inside the same container, so agents and graders share a hermetic, low-latency loop.
- **Isolation by default.** Sandboxed plugin code, no `fetch` and no remote `createImageAsync(url)` unless explicitly enabled, and no team-library or remote-key dependencies. Trials cannot phone home or cross-contaminate.

### 3.3 What we deliberately do not do

We are explicit about non-goals: HFC is not a Figma replacement. It excludes the canvas editor, multiplayer, FigJam, Slides, Buzz, prototyping, Dev Mode codegen plugins, Code Connect, video and embed nodes, plugin payments, `pluginData`/`sharedPluginData`, and byte-identical Figma rendering. This is a feature, not a limitation: it lets us guarantee the surface that *does* exist behaves consistently and is fully testable.

### 3.4 Why this matters for the contract

If the contract is "produce 100s of high-quality Figma RL tasks," the binding constraint is not authoring tasks — it is running them. With HFC:

- **No Figma seat per worker.** A trial fleet of 1,000 workers does not require 1,000 Figma seats.
- **No flaky plugin window.** Real-Figma plugin sessions tie up a desktop process; HFC runs headless.
- **Reproducibility for free.** The starting design is baked into the image; the verifier baseline is the same byte-for-byte file across every run.
- **Trainable today, exportable tomorrow.** Skills learned against HFC's MCP transfer to Figma's MCP because the tool surface is the same.

---

## 4. Task Categories This Environment Unlocks

Because HFC is a real Figma-shaped runtime with both an editable document and a renderer, this environment is not limited to a single task style. The same infrastructure cleanly supports the four high-value categories researchers are pursuing today:

| Category | What the agent does | What HFC contributes |
|---|---|---|
| **Figma design → code** | Read structure with `get_design_context` / `get_metadata`, emit React/HTML/CSS or framework-specific code. | Faithful tree, variables, styles, auto-layout, and screenshots — the same context Figma's MCP gives agents. Code can be compiled and screenshot-compared back against the source design. |
| **Code → Figma design** | Given a component or page in code, produce the equivalent Figma file. | The agent emits `use_figma` Plugin API code; HFC executes it deterministically and the verifier diff-checks the resulting tree. |
| **Screenshot → Figma design** | Reconstruct a design from an image (mock, competitor screenshot, hand sketch). | Agent uploads the asset under `/app/assets/`, builds the tree via Plugin API, and the verifier scores both structural fidelity and visual similarity to the reference image. |
| **Text → design** | Generate a design from a brief or spec. | Agent creates frames/components/variables from scratch; rubrics measure design-system adherence, hierarchy, contrast, and task completeness via LLM-judge visual checks. |

The same tasks also support **targeted edits**, **design-system implementation**, and **regression-style fixes** without changing the runtime — only the rubric.

---

## 5. Real Figma Designs as Task Sources

Synthetic stubs do not stress an agent the way a real production design system does. Our task sources are **real Figma files** that SMEs port into HFC via the **Local Figma MCP plugin** running inside Figma Desktop. The plugin captures a snapshot of the open file (frames, text with styled segments, shapes, vectors, components, instances, variables, bound variables, paint/effect/text/grid styles, auto-layout, pattern fills, embedded image bytes) and POSTs it to HFC's `/import/hfc` endpoint, which converts it into a `FileEnvelope`.

The result is a `*.hfc.json` design that:

- Was authored in real Figma against real designer constraints.
- Carries the file's variables, styles, and components — not approximations.
- Is small enough to bake into a task image and diff in milliseconds.
- Can be re-rendered to PNG to drive visual checks.

Tasks are seeded from a curated library of these designs. The `plumby-edit-footer` sample task in this submission, for example, is built from a real marketing site design imported this way and asks the agent to extend its footer with terms and privacy links — exactly the kind of incremental, contextual edit that exercises both structural understanding and design-system fluency.

---

## 6. Task Variety

The environment supports a wide spectrum of task shapes out of the box. All of them share the same runtime, MCP surface, and verifier — only the instruction and `eval-spec.json` change.

- **Greenfield additions.** "Add a new top-level frame named `Hello`, 200×100 with light gray fill at (40,40)" (`hello-frame`). Exercises basic Plugin API competence and structural sanity.
- **Targeted property edits.** "Rename `Board` to `MainBoard`" (`with-metadata`). Tests precise edits without collateral changes — guarded by `preserve_ids` and `metadata_only_under` checks so renaming the wrong node, or doing more than a rename, is penalized.
- **Contextual extensions.** "Add terms and conditions link and privacy link to the footer component" (`plumby-edit-footer`). Tests reading existing structure, matching style, and integrating new content into a real layout — graded both structurally (`must_contain_text` over new frames) and visually (`design_consistency`, `task_completeness`).
- **Design system implementation.** Build out new components, variants, or tokens against an existing system. Graded by token-adherence and style/variable-reuse design-system checks.
- **Multi-screen flows.** Build or extend pages composed of multiple frames; the verifier scopes checks per parent so credit and penalties are localized.
- **Reference-driven reconstruction.** Match a reference asset (PNG mock or competitor screenshot). Scored via the `compare_with_reference` visual check, which uses an LLM judge to score preference between agent output and reference.
- **Regression-style fixes.** Modify a node while preserving its style bindings (variables / shared styles). The `edited_regression` design-system check explicitly catches an agent stripping a textStyleId/fillStyleId and inlining values instead.

Per-task weights let SMEs tune what matters: a "rename" task downweights visual checks; a "build a hero section" task upweights them. Optional checks (`required: false`) let SMEs reward best-effort behavior without making the gate fail.

---

## 7. Rubrics — What We Check and Why

The verifier is a Python package, `figma_eval`, that runs in-process inside the trial container under RewardKit. Each rubric category exists because it defeats a specific reward-hacking failure mode we have observed in agents.

### 7.1 Hard gates — `category: gates`

Gates encode the structural invariants of the task. **Failing a gate caps the final reward at 20% of raw**, which is what makes it a *gate* and not a soft check.

- **`require_change`** — the design must actually differ from the baseline. *Prevents:* agents that "complete" the task by saying they did and never invoking `use_figma`.
- **`preserve_ids`** — listed nodes must still exist in the result. *Prevents:* agents that delete or recreate the file to satisfy a check, breaking the surrounding design.
- **`allowed_change_inside_ids`** — all additions, modifications, and deletions must happen under specified roots. *Prevents:* drive-by edits to unrelated parts of the design (a frequent failure mode in long-context plans).
- **`additions_only`** — no modifications or deletions. *Prevents:* destructive shortcuts on tasks where the goal is purely additive.

### 7.2 Structural checks — `category: checks`

These are deterministic, programmatic, and SME-configured per task. **Failing any required check caps the reward at 30% of raw.** Each check has a typed spec and validates against the JSON schema.

- **`must_contain_text` (scope: `node_id` or `new_frames`).** Asserts a substring appears in a target node, or in any frame the agent added. *Prevents:* the agent claims it added "Privacy Policy" but actually added "Privacy P" or wrote it in a hidden text node off-screen. Scoping to `new_frames` prevents satisfying the check by editing pre-existing copy.
- **`must_contain_image`.** A specific image (optionally hash-pinned) must appear in scope. *Prevents:* fabricating image presence with a colored rectangle or substituting a different asset.
- **`min_added_under` / `min_modified_under`.** At least N new (or modified) descendants under a parent. *Prevents:* skipping additions, or making cosmetic property tweaks that look like work but do nothing structural.
- **`component_instances_under`.** Asserts N instances of a specific `componentId` under a scope. *Prevents:* hand-building a fake "Card" out of frames instead of actually instantiating the design system component — a very common shortcut.
- **`metadata_only_under`.** All changes under a parent must be metadata (name, description, locked, exportSettings, reactions). *Prevents:* rename tasks where the agent rebuilds nodes instead of just renaming, or sneaks in geometry edits.
- **`property_on_node`.** Exact property equality on a node (e.g., `name == "MainBoard"`). *Prevents:* "close enough" renames and casing drift.

### 7.3 Design-system adherence — `category: design_system`

Three checks that fire automatically (no SME config required), scoped to the **content nodes the agent touched** so unrelated parts of the file are not penalized.

- **`token_adherence`.** Every value the agent writes for a known role (text color, fill, stroke, font size, spacing, padding, stroke weight, corner radius, etc.) must come from the design's observed allowlist of tokens for that role. *Prevents:* the agent introducing a one-off `#3F51B5` when the design system has a `Primary/500` variable; introducing inconsistent paddings; using arbitrary font sizes.
- **`style_variable_reuse`.** When a value matches a bindable style or variable, the agent should bind to it (`textStyleId`, `fillStyleId`, `strokeStyleId`, `effectStyleId`, `gridStyleId`, `boundVariables`, `VARIABLE_COLOR`) instead of inlining. *Prevents:* the agent stripping bindings to "simplify" the node — a regression that destroys a design system over time.
- **`edited_regression`.** A node that had a style/variable binding before the edit must still have one after. *Prevents:* the most insidious failure mode — the agent edits a node's text, accidentally drops `textStyleId`, and the design silently de-tokenizes.

These three checks together close the "looks right, breaks the system" loophole: a screenshot-based judge alone cannot tell that a binding was stripped.

### 7.4 Visual checks — `category: visual` (LLM judge)

Visual rubrics use a vision-capable LLM (configurable via `EVAL_JUDGE_MODEL`, defaults to `anthropic/claude-sonnet-4-6`) and the HFC renderer to grade what the eye actually sees. Five spec types, each chosen to target a specific judgment we cannot do programmatically:

- **`design_consistency`.** Render a focus node (largest added, all added, or `node_id`); judge spacing, typography, color, hierarchy, alignment, and content overflow on a 1–5 scale. Optional `surrounding_context_node_id` adds *fit* criteria (layout fit, scale, cohesion). *Use:* "is this thing well designed and does it belong here?"
- **`task_completeness`.** Render the minimal enclosing frame containing all changes; ask the judge to enumerate task requirements and check each. Returns a binary `completed` flag. *Use:* end-to-end gate on whether the brief was fulfilled.
- **`before_vs_after`.** Render the same surrounding context in baseline and result; ask the judge to score 0–10 how well the task was accomplished. *Use:* tasks where the value is the *delta*, not the absolute output.
- **`compare_with_reference`.** Compare agent output against a SME-provided reference image; judge returns a 0–10 preference score. *Use:* tasks with a target visual.
- **`diff` (no images).** Pass the structural diff to the judge as text. *Use:* low-cost gating before paying for renders, or for tasks where structure is the whole story.

LLM-judge calls are parallelized (default 4) and can be skipped entirely (`skip_llm=True`) for fast offline iteration, in which case visual checks return a fixed 0.75 placeholder so SMEs can still iterate on structural rubrics.

### 7.5 Heuristics — `category: heuristics`

Always-on, deterministic, scoped to content the agent touched. Cheap signals that catch the long tail of "looks plausible to a judge, fails on inspection":

- **WCAG AA contrast.** Text foreground vs. resolved background luminance; score is `min(1, mean_ratio / 4.5)`. *Prevents:* legal-risk dark-on-dark or light-on-light text.
- **Distinct font count.** Penalizes >5 distinct font signatures. *Prevents:* "novelty by font soup," a typical generative failure mode.
- **Readable font size.** Penalizes any text below 10px. *Prevents:* the agent shrinking text to fit a constraint.

### 7.6 Why scoping matters (anti-reward-hacking note)

A subtle but critical design choice: **design-system checks and heuristics only consider the node IDs the agent touched** (additions and non-metadata modifications), traversed transitively. This means:

- An agent cannot lose a point because the *baseline* design has a low-contrast section unrelated to the task.
- An agent cannot earn a point by *fixing* an unrelated low-contrast section instead of doing the task.
- A "rename a node" task does not get scored for typography variety, because the rename is metadata and produces no content scope.

---

## 8. Hierarchical Rewards

The verifier emits a single `figma_design_score` ∈ [0, 10] but produces it from a multi-tier aggregation that is much more informative for RL credit assignment. The tiers, top-down:

```
final = clamp(0, 10,  completion_gate * raw * 10)

raw = weighted_mean(category_scores, category_weights)
  where category_scores ∈ {gates, checks, design_system, visual, heuristics}
  and each is a weighted mean over its applicable subchecks

completion_gate = min(
   1.0,
   0.2 if any gate failed,
   0.3 if any required check < 1.0
)
```

Default category weights: `gates=1.0, checks=0.35, design_system=0.2, visual=0.35, heuristics=0.1`. Per-task overrides live in `eval-spec.json`. Subchecks marked `applicable=False` (because they are not relevant to this task — e.g., no content changes, so no design-system content to grade) are dropped before averaging, so unused checks neither help nor hurt.

This shape gives RL several useful properties:

- **Sharp gates, dense gradient.** An agent that only half-completes a task gets a meaningfully non-zero raw score it can climb, but cannot reach the top band without passing gates and required checks. This is the same shape that has been shown to stabilize RL on multi-step tool-use tasks.
- **Per-subcheck breakdown.** The full report lands in `/logs/verifier/eval-report-details.json` with every subcheck's `id`, `category`, `score`, `applicable`, `weight`, and `details` (matched node IDs, contrast ratios, sample violations, raw judge JSON). This is a clean signal source for offline RL rejection sampling, dense reward shaping, or post-hoc analysis.
- **Determinism where it matters.** Gates, structural checks, design-system checks, and heuristics are fully deterministic. Only the visual category uses an LLM judge, and that runs at temperature 0 with structured JSON output, parsed strictly.

---

## 9. SME-Authored Tasks and Per-Task Rubrics

This is not a benchmark dataset. Every task and every rubric is **authored by a subject-matter expert** — a designer who can read the design, understand the intent, and configure the verifier accordingly. The artifact that captures their judgment is `eval-spec.json`, validated against a published JSON schema (`shared/verifier/eval-spec.schema.json`).

What an SME configures per task:

- **Hard gates** appropriate to the task shape (`require_change`, `preserve_ids`, `allowed_change_inside_ids`, `additions_only`).
- **Structural checks** with target node IDs and scopes pulled directly from the source Figma file.
- **Visual checks** — which spec type, which node to render, which criteria to weight (consistency vs. fit), and any reference asset.
- **Design-system stance** — `allow_novelty: true` opts a creative task out of token-allowlist enforcement; default `false` enforces the system.
- **Category weights** — to express "this task is a rename, structural correctness is everything" vs. "this is a hero section, visual judgment dominates."

This per-task rubric authoring is what separates this from generic "is the JSON valid" evals. The grader has a **task-specific theory of correctness**, and that theory was written by a human who understands design.

---

## 10. Scalability — Figma Task Builder

To deliver hundreds of tasks at quality, we built a dedicated authoring tool. The **Figma Task Builder** is a Figma plugin + companion HTTP service that lets an SME, while looking at a real Figma file, produce a finished Harbor task in a few clicks.

The flow:

1. SME opens a real design in Figma Desktop.
2. The **Local Figma MCP** plugin (our plugin, running in Desktop) shows a Task Builder tab.
3. SME picks the frames that are part of the task, optionally excludes nodes, writes the instruction, fills the `eval-spec.json` (with a check catalog as helper).
4. The plugin POSTs the snapshot to HFC `/import/hfc` to convert it into a `FileEnvelope`.
5. The Task Builder service writes a draft under `envs/figma-design/task-drafts/<task-id>/` and, on **Finalize**, promotes it to `envs/figma-design/tasks/<task-id>/` — complete with `task.toml`, `instruction.md`, baked design, asset directory, and copied verifier.
6. `harbor add tasks/<task-id>` registers the task in the dataset.

This pipeline is what makes the contract economically realistic. SMEs are not editing JSON in a text editor or wiring up Dockerfiles; they are working *inside Figma* with guardrails that ensure every task lands as a runnable Harbor task with a typed eval spec.

---

## 11. Sample Tasks Included

Three tasks are bundled with this submission, chosen to show the breadth of shapes the rubric supports.

### 11.1 `hello-frame` — minimal greenfield

> Add a new top-level frame named `Hello` on Page 1. The frame should be 200×100 px, positioned at (40, 40), with a light gray solid fill.

**Rubric.** `require_change` + `preserve_ids: [I3]` gates; one structural `min_added_under` check on the page; default category weights tilted toward `checks` (`0.5`) and `visual` (`0.3`). Tests bare-minimum Plugin API competence.

### 11.2 `with-metadata` — precise targeted edit

> Rename the frame named `Board` to `MainBoard`.

**Rubric.** `require_change` + `preserve_ids: [I3, I4]` gates; `property_on_node` exact-match check on `name`; soft `metadata_only_under` check that flags any non-metadata change. This is the canonical "do exactly the thing, nothing else" task — and the rubric is built so the agent gains nothing by doing extra work.

### 11.3 `plumby-edit-footer` — contextual extension on a real design

> Add terms and conditions link and privacy link to the footer component.

**Rubric.** `require_change` gate; two `must_contain_text` checks scoped to `new_frames` ("Terms", "Privacy"); a `design_consistency` visual check on the footer node; a `task_completeness` visual check. Tests reading existing structure, integrating new content into a real layout, *and* matching the surrounding design's typography and spacing — graded both structurally and visually. This task uses a real Figma file imported via the Task Builder pipeline above.

---

## 12. Running and Verifying

The full operational details are in [`envs/figma-design/README.md`](../README.md). The short version, from a host with Docker running:

```bash
# Build the base image once
node envs/figma-design/scripts/build-base.mjs

# Run a single task
harbor run -p envs/figma-design/tasks/hello-frame --env docker \
  -a terminus-2 -m anthropic/claude-sonnet-4-6

# Run the full sample dataset
harbor run -p envs/figma-design --env docker \
  -a terminus-2 -m anthropic/claude-sonnet-4-6
```

Per-trial outputs:

- `/logs/verifier/reward.json` — final RewardKit reward (`figma_design_score`).
- `/logs/verifier/eval-report-details.json` — full subcheck breakdown.
- The mutated `design.hfc.json` — final design state.

The same env runs as a Harbor `TaskConfig` for RL training.

---

## 13. What We Are Asking For

This submission is a **proof of capability**, not a finished product. The three sample tasks demonstrate the runtime, the rubric machinery, and the SME workflow end-to-end. With the contract, we will:

- Curate a library of real Figma designs spanning marketing sites, dashboards, mobile apps, and design-system kits.
- Author **hundreds of tasks** across the four categories in §4 with SME-tuned rubrics per task.
- Continue parity work on HFC against Figma's Plugin API — particularly Phases 7–9 of our roadmap (richer traversal, layout sizing, fonts, images, deeper variables and styles parity).
- Expand the verifier as we learn new reward-hacking patterns from real RL runs.

We are confident this is the right substrate for Figma RL because:

- **Surface parity.** Same Plugin API, same MCP tools, same node graph as Figma.
- **Scalable.** No Figma seats, no rate limits, hermetic containers.
- **Trainable.** Hierarchical rewards with deterministic gates and dense subscores.
- **Hard to game.** Every check exists to defeat a specific shortcut, and scoping prevents the agent from earning credit on unrelated work.
- **SME-authored.** Tasks and rubrics are written by humans who know what good looks like.

We look forward to your feedback.

---

### Sources

- [Kleiner Perkins — Figma made design collaborative](https://www.kleinerperkins.com/perspectives/figma-made-design-collaborative-today-it-makes-history/)
- [AInvest — Figma's $33B TAM growth playbook](https://www.ainvest.com/news/figma-33-billion-tam-growth-investor-playbook-market-capture-2601/)
- [SaaStr — 5 Interesting Learnings From Figma at $900M ARR](https://cloud.substack.com/p/5-interesting-learnings-from-figma)
- [Longyield — Figma: The Design Empire That Survived](https://longyield.substack.com/p/figma-the-design-empire-that-survived)
- [Ramp — Figma vendor adoption data](https://ramp.com/vendors/figma)
- [Figma — Q1 2026 financial results](https://investor.figma.com/news-events/news/news-details/2026/Figma-Announces-First-Quarter-2026-Financial-Results/default.aspx)
- [The Motley Fool — Figma Q1 2026 earnings call transcript](https://www.fool.com/earnings/call-transcripts/2026/05/15/figma-fig-q1-2026-earnings-call-transcript/?source=iedfolrf0000001)
- [Figma blog — Introducing the Dev Mode MCP server](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [Figma developer docs — Remote MCP server](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)

*Content from third-party sources was rephrased and summarized for licensing compliance.*
