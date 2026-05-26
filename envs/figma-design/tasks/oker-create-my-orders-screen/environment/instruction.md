A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

# Create 'My Orders' screen

## Goal

- You need to create a new section in the final design page. Call it "Orders".
- Within it, create a new screen which will show the list of orders placed by the user
- It must show basic information about the order like order number, date
- For each order we must show the products in that order
- Items may arrive in multiple shipments. Hence for each product we must show its status (Ordered, Shipped, Delivered, Cancelled)
- If a product is in Shipped status, we must show when was the status last updated
- Image of each product must be displayed
- For each Order in the list, there should be a way to navigate to the order details screen. You don't need to create order details screen.