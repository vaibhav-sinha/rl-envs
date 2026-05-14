<!-- source: https://developers.figma.com/docs/figma-mcp-server/create-skills -->

- Figma MCP Server
- Q&A
- Create skills for the Figma MCP server

On this page

Skills let you package a repeatable Figma workflow into a reusable instruction set. Instead of rewriting long prompts and re-explaining conventions each time, a skill gives your MCP client a stable sequence of steps to follow, which improves consistency and reduces drift across runs.

For the Figma MCP server specifically, custom skills are how you teach an agent to extend your existing design system rather than working around it. A well-written skill can direct the agent to search your libraries first, apply your variable naming and modes, and build with real components and auto layout structure that matches your team’s standards.

- Migrate legacy styles or one-off values to Variables using your library’s taxonomy (including light/dark or brand modes).
- Standardize or generate component sets to match your team’s variant/property conventions and token usage.
- Generate screens from existing library components, with validation steps to catch mismatches and iterate.
- Run “update and sync” workflows that check what exists, update what changed, and keep design assets aligned with code.

### **Set up your skill**[​](#set-up-your-skill "Direct link to set-up-your-skill")

To get started, follow the instructions for your client.

#### **Claude Code (Anthropic)**[​](#claude-code-anthropic "Direct link to claude-code-anthropic")

1. Create a skill directory in your repo: `.claude/skills/<skill-name>/`.
2. Create `SKILL.md` in that directory: `.claude/skills/<skill-name>/SKILL.md`.

#### **Codex by OpenAI**[​](#codex-by-openai "Direct link to codex-by-openai")

1. In the Codex CLI or desktop app, run: `$skill-creator`.
2. Follow the prompts; the creator will generate a new skill (a folder containing `SKILL.md`).

#### **Cursor**[​](#cursor "Direct link to cursor")

1. In Cursor chat, run: `/create-skill`.
2. Describe the skill you want and follow the prompts; Cursor will scaffold a new skill (a folder containing `SKILL.md`, stored in your workspace skills location).

### **Craft your skill**[​](#craft-your-skill "Direct link to craft-your-skill")

1. Name your skill. Use a short, stable identifier in lowercase with hyphens, and make it match the skill folder name (for example, `convert-to-variables`).
2. Describe when the MCP client should use your skill. Write a `description` that says what it does and when to use it (for example, “Build a full-page screen using existing library components and variables” rather than “Generate screens”).
3. Add a clear title and purpose in the body. Start the markdown body with a `#` heading that matches the workflow (for example, `# Generate screen`).
4. List when to use it. Add a `## When to use` section with a few bullets describing the situations where this workflow applies. For example, “creating new screens that must follow an existing design system library”.
5. Write the instructions as an ordered procedure. Add an `## Instructions` section with numbered steps the agent should follow, in the correct order, using imperative language. For example:

   - “Search the library first”
   - “Bind fills/strokes/text to variables”
   - “Prefer semantic tokens”
6. Include at least one concrete example. Add an `## Examples` section showing a representative input request and the expected output summary (what gets created/updated, at what scope).
7. Document common edge cases and fallbacks. Add a `## Common edge cases` section describing what to do when the ideal path fails. For example, missing components/tokens, ambiguous mappings, unsupported node types.
8. Use optional frontmatter only when needed. Add fields like `compatibility`, `metadata`, or `allowed-tools` only if you have a real requirement to express, such as “requires Figma MCP server tools” or internal ownership/versioning.

### **Advanced**[​](#advanced "Direct link to advanced")

As your skills become more capable, you may want to include more than a single SKILL.md file. In addition to the main instructions file, a skill can also include supporting files such as scripts, references, and assets.

These extra files are useful when your workflow needs more detail, reusable resources, or structured inputs. They can also help you keep the main SKILL.md focused on the core instructions, while moving longer or more specialized material into files the client can load only when needed.

#### **Scripts**[​](#scripts "Direct link to scripts")

A skill can include executable scripts in a scripts/ folder. These are useful when part of the workflow is easier, safer, or more consistent to handle with code instead of with natural-language instructions alone.

For example, you might use a script to transform input data, validate a file before making changes, generate a repeated structure, or check output for common errors. In general, scripts work best when they are self-contained, clearly document any dependencies, and return helpful error messages so the MCP client can understand what happened and what to do next.

#### **References**[​](#references "Direct link to references")

A skill can also include additional documentation in a references/ folder. Reference files are helpful when your workflow depends on more detailed guidance than you want to place in the main SKILL.md.

For example, you might include a naming guide, a variable taxonomy, component rules, a schema reference, or a longer technical playbook for a specific workflow. Keeping these files focused and scoped to a single topic makes them easier for the MCP client to use when needed, without adding unnecessary length to the main skill instructions.

#### **Assets**[​](#assets "Direct link to assets")

A skill can include static resources in an assets/ folder. Assets are useful when the workflow depends on reusable materials that the MCP client may need to read from, compare against, or use as a starting point.

For example, assets might include templates, example files, diagrams, lookup tables, or structured data files. In a Figma workflow, this could mean things like a starter content template, a naming map, or an example of the output structure you want the client to follow. Assets are especially useful when you want your skill to produce results that are more consistent across files, teams, or repeated runs.

### **Example skill**[​](#example-skill "Direct link to example-skill")

`---`
`name: figma-apply-palette`
`description: "Creates local paint styles in a Figma file from a list of hex color values. Use when seeding or applying a color palette into Figma from an external list of colors. Does not create color variables or bind to design system tokens — use figma-generate-library for that."`
`compatibility: Requires the figma-use skill to be installed alongside this skill`
`metadata:`
`mcp-server: figma`
`---`

`# Apply Color Palette — Figma MCP Skill`

`` Creates local paint styles in a Figma file from a user-provided list of hex color values using `use_figma`. ``

`` **Always pass `skillNames: "figma-apply-palette"` when calling `use_figma` as part of this skill.** This is a logging parameter — it does not affect execution. ``

`## Prerequisites`

`` **You MUST invoke the `figma-use` skill (Skill tool: `skill: "figma-use"`) before every `use_figma` call.** It contains critical Plugin API rules, gotchas, and script templates that prevent hard-to-debug failures. Never call `use_figma` without it. ``

`## Skill Boundaries`

`**This skill does:** Create local paint styles from a list of hex values with optional names.`

`` **This skill does not:** Create color variables, bind styles to design system tokens, or modify existing styles. For a full design system token workflow, use `figma-generate-library`. ``

`If the user asks for something outside these boundaries, say so and suggest what skill or approach would be appropriate.`

`## Workflow`

`### Step 1: Gather inputs`

`Ask the user for:`
`- The Figma file URL or file key to write to`
`` - The list of hex values to apply, with optional names (e.g. `Brand/Blue → #3B82F6`) ``

`` If names are not provided, derive them from the hex value (e.g. `Color/#3B82F6`). ``

`### Step 2: Check for existing paint styles (optional)`

`If the user wants to avoid duplicates, or if the file may already have styles, run a read-only inspection first:`

```` ```js ````
`(async () => {`
`try {`
`const styles = figma.getLocalPaintStyles().map(s => ({ id: s.id, name: s.name }));`
`figma.closePlugin(JSON.stringify({ styles }));`
`} catch(e) { figma.closePluginWithFailure(e.toString()); }`
`})()`
```` ``` ````

`Skip any colors whose names already exist in the result.`

`### Step 3: Create paint styles`

`` Create all styles in a single `use_figma` call: ``

```` ```js ````
`(async () => {`
`try {`
`const palette = [`
`{ name: "Brand/Blue", hex: "#3B82F6" },`
`// ... populate from user input`
`];`

`function hexToRgb(hex) {`
`return {`
`r: parseInt(hex.slice(1, 3), 16) / 255,`
`g: parseInt(hex.slice(3, 5), 16) / 255,`
`b: parseInt(hex.slice(5, 7), 16) / 255,`
`};`
`}`

`const created = [];`
`for (const { name, hex } of palette) {`
`const style = figma.createPaintStyle();`
`style.name = name;`
`style.paints = [{ type: "SOLID", color: hexToRgb(hex), opacity: 1 }];`
`created.push({ id: style.id, name: style.name });`
`}`

`figma.closePlugin(JSON.stringify({ created }));`
`} catch(e) { figma.closePluginWithFailure(e.toString()); }`
`})()`
```` ``` ````

`Confirm with the user how many styles were created.`

`## Error Recovery`

`` On any `use_figma` error: ``
`1. **STOP** — do not immediately retry`
`` 2. Call `get_metadata` to inspect partial state and identify orphaned styles ``
`3. Remove duplicate or partial styles before retrying`
`4. Fix the root cause, then retry`

`` For the full validation workflow, load `figma-use` (Skill tool: `skill: "figma-use"`) and see its validation-and-recovery reference. ``

Then add client-specific enhancements only where you need them.

### **Best practices**[​](#best-practices "Direct link to best-practices")

- **Write descriptions like routing rules.** A skill triggers (or gets selected) largely based on `description`, so include both *when to use* and *when NOT to use*.
- **Keep the main `SKILL.md` focused; offload details into supporting files.** Both Claude Code and VS Code emphasize bundling resources and referencing them as needed.
- **Use manual-only skills for high-risk actions.** Several clients support `disable-model-invocation` to prevent automatic activation for workflows with side effects.

### **Test your skill**[​](#test-your-skill "Direct link to test-your-skill")

When you’re done creating your skill, test it out in Figma using a duplicate or example file. Don’t test your skill using a working file that’s important.

**Claude Code (Anthropic):** Type `/<skill-name>` in Claude Code chat to invoke the skill.

**Codex by OpenAI:** Using the Codex CLI or desktop app, run `/skills` (or type `$`) and select your skill to insert it into the prompt (explicit invocation).

**Cursor:** In Agent chat, open the slash command menu (`/`) and select your skill (you can also invoke via `/<skill-name>` when using manual invocation).

[Previous

Skill: create\_new\_file — Create a New Figma File](skill-figma-create-new-file.md)[Next

The server keeps returning web/react code](server-returning-web-code.md)

- [**Set up your skill**](#set-up-your-skill)
- [**Craft your skill**](#craft-your-skill)
- [**Advanced**](#advanced)
- [**Example skill**](#example-skill)
- [**Best practices**](#best-practices)
- [**Test your skill**](#test-your-skill)
