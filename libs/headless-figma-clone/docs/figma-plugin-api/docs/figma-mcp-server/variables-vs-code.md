<!-- source: https://developers.figma.com/docs/figma-mcp-server/variables-vs-code -->

- Figma MCP Server
- Q&A
- Tried to fetch variables, but got code instead

If you intended to get variable names and values (like colors or spacing tokens), but your AI assistant returned code instead, it probably didn't trigger the correct MCP tool.

By default, the agent chooses which tool to call based on your prompt. But sometimes it guesses wrong.

**Don't worry, there is an easy fix.**

In your prompt, say exactly what you want. For example:

```
Get the variable names and values for this selection
```

This nudges the agent to run the right tool.

[Previous

It's stuck or too slow](stuck-or-slow.md)[Next

I'm getting a 500 error](getting-500-error.md)
