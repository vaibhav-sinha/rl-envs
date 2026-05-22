# Add max OTP attempts onboarding screen

A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

You must not invoke Headless Figma Clone (HFC) APIs directly. Use only the **Figma** MCP tools (`use_figma`, `get_metadata`, `get_screenshot`, and the other tools exposed by that server). Do not call the HFC CLI (`node /opt/hfc/dist/cli.js`, `hfc render`, etc.), curl or HTTP requests to the HFC server (e.g. `http://127.0.0.1:3847/`), or any other path that bypasses the MCP tool surface.

You must not read these paths directly (no Read tool, `cat`, or other file access):

- `/data/workspace/` (the entire workspace directory, including `design.hfc.json`, `issues.hfc.json`, and any other files there)
- `/tests/` and `/opt/figma-verifier/` (verifier code and grading inputs — use the Figma MCP tools instead)

## Goal

In the final design, the onboarding sequence already has the states for OTP based login. However, we want to restrict the user from requesting too many OTPs and hence want to introduce a cool down period. After 3 OTPs were generated, the resend OTP button will be disabled and instead a message should appear saying "You have reached your max attempts. Retry OTP generation after 15:00 minutes". The minutes displayed will be a countdown updated every second. Add this state also to the onboarding sequence designs.
