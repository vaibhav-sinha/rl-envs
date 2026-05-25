# Oker sale section readonly tool baseline

Fixture: `envs/figma-design/designs/oker-final-design/design.hfc.json`  
Figma node: `1655:195069` → HFC `I9149`

Method: median of 3 runs, `timing.durationMs` from the same paths as `scripts/bench-readonly-tools.mjs` (MCP tool queue + compile + Playwright for screenshot).

## Golden compile hash (legacy clone path)

```
dce688de0013bc2669c2aee7916b0b8892737b6acc02fe850da83709ac3bdcd4
```

Overlay compile (`renderContext` + engine graph, no envelope clone) must match this hash. Regenerate with:

```bash
npm run build -w headless-figma-clone
node libs/headless-figma-clone/scripts/capture-oker-golden.mjs
```

## MCP tool timing (pre vs post)

| Tool | Pre (`d3e8558`, before overlay) | Post (`905589d`, overlay + memo) | Δ ms | Δ % |
|------|----------------------------------|-----------------------------------|------|-----|
| `get_design_context` | 8886 | 6390 | −2496 | −28% |
| `get_screenshot` | 8794 | 6296 | −2498 | −28% |

Pre-change: parent of commit `905589d` (`d3e8558`), legacy `compileSubtree` (full envelope `structuredClone`, no `renderContext`).  
Post-change: current `compiler-optimizations` / `905589d`, MCP path with `engine.getGraphIndexes()` + `CompileRenderContext`.

Re-run:

```bash
# Post (overlay path)
npm run build -w headless-figma-clone
npm run benchmark:readonly-compile -w headless-figma-clone

# Pre (legacy path): checkout parent commit, cherry-pick or copy scripts/bench-readonly-tools-legacy.mjs, then:
git checkout d3e8558
npm run build -w headless-figma-clone
node libs/headless-figma-clone/scripts/bench-readonly-tools-legacy.mjs
git checkout compiler-optimizations
```

Recorded: 2026-05-25.
