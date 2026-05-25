# Oker sale section readonly tool baseline

Fixture: `envs/figma-design/designs/oker-final-design/design.hfc.json`  
Figma node: `1655:195069` → HFC `I9149`

## Golden compile hash (legacy clone path)

```
dce688de0013bc2669c2aee7916b0b8892737b6acc02fe850da83709ac3bdcd4
```

Overlay compile (`renderContext` + engine graph, no envelope clone) must match this hash. Regenerate with:

```bash
npm run build -w headless-figma-clone
node libs/headless-figma-clone/scripts/capture-oker-golden.mjs
```

## MCP tool timing

Record `timing.durationMs` from tool JSON (median of 3 runs):

```bash
npm run benchmark:readonly-compile -w headless-figma-clone
```

| Tool | Median durationMs | Notes |
|------|-------------------|-------|
| `get_design_context` | 6450 | Overlay compile path (post Phase 2) |
| `get_screenshot` | 6400 | Pattern tiles + Playwright (post Phase 4 wiring) |

Re-run after each phase and compare to prior row.
