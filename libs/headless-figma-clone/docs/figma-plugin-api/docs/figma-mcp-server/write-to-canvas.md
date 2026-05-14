<!-- source: https://developers.figma.com/docs/figma-mcp-server/write-to-canvas -->

- Figma MCP Server
- Core server features
- Write to canvas

On this page

note

**Note:** We're quickly improving how Figma supports AI agents. This will eventually be a usage-based paid feature, but is currently available for free during the beta period.

Using the remote Figma MCP server’s `use_figma` tool, you can prompt your MCP client to write directly to the canvas using real Figma-native structure. Instead of describing layouts in chat and rebuilding them by hand, you can generate frames, components, variables, and auto layout directly in a Figma file.

Design systems are a great fit for this workflow. Your team has already defined the components, properties, tokens, and naming conventions that shape how products get built. Using `use_figma` to write to the canvas, an agent can use that existing system as it creates new work. Rather than drawing static shapes that only look right in a screenshot, it can build with the same buttons, variables, and layout rules your team already relies on. That makes generated output easier to inspect, refine, and extend without having to reconcile it with your library afterward.

What lands on the canvas is standard Figma content your team can actually work with. Because the result is editable and structured, it becomes a better place to review ideas, align on decisions, and push a direction forward. By bringing agents directly into the canvas, the Figma MCP server helps close the loop between your design system and the work built from it. This creates a more direct path from system → canvas → code, with the same source of truth guiding each step.

note

**Note:** For a great overview of the write to canvas feature, check out our Shortcut blog: [The Figma canvas is now open to agents](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/). Explore how to build with agents using your design system, directly on the Figma canvas.

## Supported Clients[​](#supported-clients "Direct link to Supported Clients")

The write to canvas tool can be used with [select MCP clients](https://help.figma.com/hc/en-us/articles/32132100833559#h_01K25F7RBRZKCATVJHNXCS6KXW):

- Augment
- Claude Code
- Claude Desktop
- Codex by OpenAI
- Copilot CLI
- Cursor
- Factory
- Firebender
- VS Code
- Warp

## Get started[​](#get-started "Direct link to Get started")

Figma’s write to canvas tool, [`use_figma`](tools-and-prompts.md#use_figma), is a feature of the Figma MCP server. By prompting the Figma MCP server, you can create and modify native Figma content directly in a Figma Design file.

Write to canvas works by letting your client execute JavaScript in the context of a Figma file through the Plugin API. This allows agents to create and update real design structure, such as frames, components, variants, variables, and auto layout, rather than generating a screenshot or static export.

You need a Full seat to write to Figma files with agents. Dev seat holders can use the Figma MCP server for read-only workflows such as pulling design context, variables, and screenshots. To modify an existing file, you also need edit permission for that file.

To get started:

1. [Set up the remote Figma MCP server.](remote-server-installation.md) Follow the steps for your client.
2. Open the Figma Design file you want to work in, then copy either the file URL or a link to a specific selection. The remote Figma MCP server is link-based, so your client needs that link to understand which file or node to use.
3. Prompt your client to write to the canvas. For example:

   - "Using this Figma file: <Figma file URL>, create a new page and build a settings screen with auto layout using our existing components."
   - "Using this selection: <link to selection>, convert these raw values to variables and update the surrounding components to use them."
   - "Using this Figma file: <Figma file URL>, add a new empty state that matches the existing design system."

   Your client should inspect the file, discover the existing structure and conventions, and then use `use_figma` to make the requested changes. Depending on the client, it may also load the required skill for `use_figma` before making write actions.
4. Review the result in Figma and continue iterating:

   - Open the file in Figma and inspect the generated or updated content.
   - Prompt your client to refine the result, make adjustments, or continue building in the same file.

**Tips:**

- Include the file URL or link to selection in your prompt so your client knows exactly where to work.
- If you’re making multiple edits in the same conversation, your client will usually infer that you want to keep working in the same file.

  For example, if you prompt "Using this file: <Figma file URL>, create a profile settings screen," you can subsequently prompt things like "Add an empty state below that" or "Now convert the color values in this section to variables."
- Large changes work best incrementally. In general, your client should inspect first, then create or update variables, components, and layouts in smaller steps and validate as it goes.
- When working with a design system, mention the libraries, components, variables, or modes you want the client to use. The best results come from matching what already exists in the file.

## Current limitations[​](#current-limitations "Direct link to Current limitations")

- 20kb output response limit per call
- No assets (image) support yet - including no importing components that have images/videos, or creating GIFs
- Custom fonts aren't supported yet
- Components must be manually published before Code Connect completes
- Beta-level quality — output may need manual review and cleanup
- The tool is evolving and will improve through the beta period

For further questions, see the [Figma MCP server FAQs](https://help.figma.com/hc/en-us/articles/39252411778583).

[Previous

Resources (Make → MCP)](bringing-make-context-to-your-agent.md)[Next

Code to canvas](code-to-canvas.md)

- [Supported Clients](#supported-clients)
- [Get started](#get-started)
- [Current limitations](#current-limitations)
