<!-- source: https://developers.figma.com/docs/figma-mcp-server/trigger-specific-tools -->

- Figma MCP Server
- How to get the best output
- Trigger specific tools when needed

On this page

The MCP supports different tools, and each one provides your AI assistant with a different kind of structured context. But sometimes, the assistant doesn't automatically pick the right one, especially as more tools become available.

That's why it's often helpful to nudge it by calling the tool explicitly in your prompt.

1. `get_design_context` provides a structured **React + Tailwind** representation of your Figma selection. This is a starting point that your AI assistant can then translate into any framework or code style, depending on your prompt.
2. `get_variable_defs` extracts the **variables and styles** used in your selection (color, spacing, typography, etc). This helps the model reference your tokens directly in the generated code.

## Example:[​](#example "Direct link to Example:")

Several users reported trying to get variable values, but received raw code instead, until they changed the prompt to something like:

`Get the variable names and values used in this frame`

This clarified the intent and successfully triggered the correct tool.

**Bottom line** - If the output feels off or missing something, try being explicit about the tool, especially as we add more capabilities.

[Previous

Write effective prompts to guide the AI](write-effective-prompts.md)[Next

Add custom rules and instructions](add-custom-rules.md)

- [Example:](#example)
