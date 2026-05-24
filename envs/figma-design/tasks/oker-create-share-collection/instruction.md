A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)


## Goal

We want to create the designs for a feature called Share Collection. It needs the follows:

- The screens should be added to My collection section.
- It should show one screen of a collection page which will have a share button/icon
- Clicking on it opens a bottom sheet showing a list of your friends. Each has an image and name
- For images for friends you can use images present in /app/assets/ dir
- Next to each friend there will be a checkbox. Multiple friends can be selected.
- There will be a search box to search friends
- There will be a Share button at the bottom