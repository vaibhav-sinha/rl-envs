A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

# oker-create-brand-filter-screen

## Goal

In the PLP filters screen, we can choose what to filter by. One of the option is to filter by brand. However there is no design showing how the brand wise filter would look. We need the following implemented:

- A screen which shows the design of the brand based filters
- It should allow selecting multiple brands
- It should have the option to select all, deselect all, etc
- Each brand should show its icon too
- Pick the brand names and icons from the other screens. Its ok to list the same brand multiple times in the design if you cannot find enough brands