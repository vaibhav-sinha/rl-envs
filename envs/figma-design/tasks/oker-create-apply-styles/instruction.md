A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

# Create and Apply Styles

## Goal

In the Final design page, find the section called "Add to cart". In that pick the left most frame called PDP. We have to make changes to it.

- For ever node in the frame, at any nesting level, if there is a fill, then we want to create a Fill/paint/color style for it. 
- We then want to use the newly create fill style in the node.
- For text nodes too, we want to use a style for the fill.
- If variables already exist for the color, then the style should reference the variable
- The name of the styles should be understandable so that a designer can understand in what context it has to be used