A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

# Edit 'product details page' screen

## Goal

In the Final design page, find the section called Product details page. Pick the first screen frame (leftmost) in it which is named PDP. We want to make a few edits to it.

- Immediately below the color and size choices, we should have the shipping and delivery section.
- Add to cart should also be part of that section itself
- After that he product details section should be expanded by default.
- Next, the More information section should come, without the Add to cart button
- 'See how the product is styled' should come after it
- Rest of the sections will be in the same order as now