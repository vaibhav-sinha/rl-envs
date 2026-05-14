<!-- source: https://developers.figma.com/docs/figma-mcp-server/tools-not-loading -->

- Figma MCP Server
- Q&A
- Tools aren't loading or connection lost

If you enabled the MCP server in your IDE but the tools aren't loading:

1. **Make sure the Figma Dev Mode server is actually enabled in the Figma desktop app.**

   Open the file in Figma → Switch to Dev Mode → Locate the MCP section → Enable.
2. **Check that the Figma app is running and the file is open.**

   The server only runs when the file is active in the desktop app.
3. **Try restarting**

   If everything looks set up but the tools still don't load:

   - Restart the Figma app
   - Restart your IDE

If you see an error like *"We're having trouble connecting to the model provider"*, that usually means your AI assistant (like Cursor, Copilot or Claude Code) can't reach the model, or the connection timed out. Try again or wait for the connection to be restored.

[Previous

What the MCP sends vs. what the agent does](mcp-vs-agent.md)[Next

It's stuck or too slow](stuck-or-slow.md)
