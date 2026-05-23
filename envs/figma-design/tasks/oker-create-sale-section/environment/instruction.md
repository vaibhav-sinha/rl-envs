A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

## Goal

In the Shop tab of the home screen, below the trending products section, we want to add a Sale section which will show product bundles which are on sale. A product bundle will contain 3-4 products and when bought together the user will get a discount.

- Show all the products part of the bundle in the card
- Give a logical name and description to the bundles you add to the design
- Ensure all items in the bundle are not of the same type. For example, no one would buy a bundle with 3 beds.
- The card should clearly show the discount on the bundle in a way that makes it attractive and eye catching
- The whole sale section should stand out among rest of the sections
- The sale section should have a banner which tells how many bundles are remaining. We want to use it to create urgency. The counter on it would keep decrementing as sales happen.
- The section should use a horizontal slider to show more bundles

While making the design keep the following in mind:

- There might be multiple home screen designs in the file. You just need to make edits to the first one (i.e. the left most one)
- You do not need to create scrolled state separately
- For images to use, you can pick them from the designs of the other sections
