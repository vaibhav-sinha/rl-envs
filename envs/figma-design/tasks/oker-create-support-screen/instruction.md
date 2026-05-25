A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

# Create support screen

## Goal

- In the Final design page, create a new section called Support
- In that we want to create the design for a Chat Support screen
- In the chat support, it would show the order details at the top in a thin bar, along with the status so that the user has context about which order they are communicating with support for
- We need to show designs of user and support agent messages
- We also need to show a message which has an image in it
- The input box should have options to add image or file attachment
- There should be a way to close the chat session