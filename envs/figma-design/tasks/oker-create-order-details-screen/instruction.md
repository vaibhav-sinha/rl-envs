A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

# Create order details screen

## Goal

- You need to create a new section in the final design page. Call it "Orders".
- Within it, create a new screen which will show the order details for an order placed by the user
- It must show basic information about the order like order number, date, amount
- Items may arrive in multiple shipments. Hence we need to show per shipment items and tracking
- Per shipment, depending on shipment status different details should be displayed
- For shipment status Ordered, the item details must be shown
- Item details must contain the image, name, and brand
- For order status shipped, courier details, and tracking information must shown
- Similarly show relevant information for order stats "Out for deliver" and "Delivered"
- User should be able to access the total amount along with breakup on this screen
- User should be able to access the delivery address from this screen