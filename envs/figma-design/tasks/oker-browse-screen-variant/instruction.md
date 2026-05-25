A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

# Create Browse screen variant

## Goal

- Go to the Final design page. Find the section called Browse. Find the first screen within it called Browse/Category.
- We want to create a variant of this screen. Do not modify the existing screen. Create a new screen to show how else Category level product browsing can be designed
- In the new design, do not have small category icons kind of list view. Instead, use large cards for category.
- The cards should have the category image as bg and the category name and any other details should come as text overlay on the image itself. Make sure the text is legible against the image bg.
- Instead of a list view, use a grid view with two categories per row