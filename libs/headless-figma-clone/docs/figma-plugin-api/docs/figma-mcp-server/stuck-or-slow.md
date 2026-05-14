<!-- source: https://developers.figma.com/docs/figma-mcp-server/stuck-or-slow -->

- Figma MCP Server
- Q&A
- It's stuck or too slow

Sometimes the request hangs, takes too long, or returns incomplete results. Most often, it's due to selection size:

- **Selection is too large**

  Try selecting smaller sections or individual components (e.g. a card, header, sidebar). Large, deeply nested frames can overwhelm the context window and slow things down, or silently fail.

  For more details, see [5. Avoid selecting large, heavy frames](avoid-large-frames.md)
- **Local model timeout or confusion**

  If you see an error like **"lost connection to MCP server"**, that's coming from the **AI agent**. It likely timed out or misinterpreted the context. Retry with a smaller selection or clearer prompt.

> Note: Since the MCP server runs locally, it's not affected by traffic. Most slowdowns come from the size of the selection or how the model handles it.

[Previous

Tools aren't loading or connection lost](tools-not-loading.md)[Next

Tried to fetch variables, but got code instead](variables-vs-code.md)
