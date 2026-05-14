<!-- source: https://developers.figma.com/docs/figma-mcp-server/code-to-canvas -->

- Figma MCP Server
- Core server features
- Code to canvas

On this page

note

**Note:** Code to canvas is different from the Figma MCP server's write to canvas feature, which opens the canvas in Figma Design and FigJam up to agents. Learn more: [Write to canvas](write-to-canvas.md)

Using the remote Figma MCP server, you can convert live UI from your browser into editable Figma frames. Capture a single screen or an entire flow in one session.

Code-first workflows often produce UI that grows organically. Sharing it usually means screenshots or asking someone to run a build locally. The Figma MCP server brings real UI into Figma instead. You can capture the full sequence of a multi-step flow and view each step side by side. Structural issues such as abrupt permissions, unclear empty states, and steps that should be combined become easier to spot than when inspecting one route at a time.

Captured frames become standard Figma design layers. You can use the canvas to organize, duplicate, rearrange, refine copy, and annotate decisions. Reviewing the UI on the canvas helps your team align on structure and intent before committing changes back to code.

By bringing your code to the canvas, the Figma MCP server help close the loop between your designs and your codebase. After you complete reviews of your captured UI, prompt the Figma MCP server with a link to a Figma frame. Your agent can then implement the UI changes and decisions from the shared design. This completes the roundtrip: UI rendered from code → canvas for alignment → back to code for implementation.

## Supported Clients[​](#supported-clients "Direct link to Supported Clients")

The code to canvas tool can be used with [select MCP clients](https://help.figma.com/hc/en-us/articles/32132100833559#h_01K25F7RBRZKCATVJHNXCS6KXW):

- Augment
- Claude Code
- Codex by OpenAI
- Cursor
- Factory
- Firebender
- VS Code
- Warp

## Get started[​](#get-started "Direct link to Get started")

Figma’s code to canvas tool, [`generate_figma_design`](tools-and-prompts.md#generate_figma_design), is a feature of the Figma MCP server. By prompting the Figma MCP server, you can capture live UI to:

- New Figma Design files
- Existing Figma Design files
- Your clipboard

You can have any seat to use the code to canvas tool to create or edit files in your drafts. To edit an existing file outside your drafts, you must have a Full seat and edit permission.

To get started:

1. [Set up the remote Figma MCP server.](remote-server-installation.md) Follow the steps for your client.
2. Prompt your client to capture your interface. For example:

   - To a new file: “Start a local server for my app and capture the UI in a new Figma file.”
   - To an existing file: “Start a local server for my app and capture the UI in <Figma file URL>.” If the URL doesn’t correspond to a Figma Design file, your client defaults to creating a new file instead.
   - To your clipboard: “Start a local server for my app and use the Figma MCP server to capture the UI to my clipboard.”

   Your client should start the server, inject the necessary script for the code to canvas tool, and open a browser window. Your client may also ask you to select which Figma organization or team you want to use for the capture.

   The tool makes an initial capture when the browser window first opens.
3. In the browser window, use the code to canvas toolbar to capture specific parts of the UI and different states:

   - Click **Entire screen** to capture the current full state of your interface
   - Click **Select element** to capture a specific element in the interface
4. When you’re done capturing your UI:

   - If you’re capturing UI to a Figma Design file, click **Open file**.
   - If you’re capturing UI to your clipboard, paste the design layers into a Figma file of your choice.
   - You can also prompt your client to complete the process.

**Tips:**

- If you or your client have already started a local server, you can exclude the “Start a local server for my app…” portion of the example prompts. Generally, your client may infer that a local server needs to be available, but it can help to be specific the first time.
- If you’re capturing UI multiple times in a conversation, your client will usually infer that you want to send the UI to the same file.

  For example, suppose you’re capturing the interface of a site with multiple pages. If you prompt “Capture the login page to <an existing Figma Design file URL>,” you can subsequently prompt things like “Capture checkout to the same file” or even simply, “Also capture the account screen.”

  Generally, your client will know you want to use the same Figma file, or will you ask you to confirm.
- When you’re capturing UI to an existing file, your client can suggest recent files you’ve created or edited as options.
- If you’re trying to capture your UI from a live web app or site, you can prompt your client to use a tool like Playwright to inject the required script. For local UI, this isn’t necessary.

[Previous

Write to canvas](write-to-canvas.md)[Next

Code Connect integration](code-connect-integration.md)

- [Supported Clients](#supported-clients)
- [Get started](#get-started)
