# Add max OTP attempts onboarding screen

A design file is already open in **Figma**. Interact with it using the **Figma** MCP server and only that.

## Goal

In the final design, the onboarding sequence already has the states for OTP based login. However, we want to restrict the user from requesting too many OTPs and hence want to introduce a cool down period. After 3 OTPs were generated, the resend OTP button will be disabled and instead a message should appear saying "You have reached your max attempts. Retry OTP generation after 15:00 minutes". The minutes displayed will be a countdown updated every second. Add this state also to the onboarding sequence designs.
