# Bounding boxes and layout resolution

[← Design index](./index.md)

## Phased responsibility

| Phase | Responsibility |
|-------|----------------|
| 1 | Node `x,y,width,height` are **authoritative** for FRAME; no auto layout. |
| 2 | Compute `absoluteBoundingBox` for FRAME/TEXT with rotation **optional** — **binding:** if `rotation` present, `absoluteBoundingBox` is axis-aligned bounding box (AABB) of rotated rect around top-left pivot **default** pivot `(0,0)` of node — **correction:** CSS uses center transform in later phases; Phase 2 binding: pivot is **top-left** `(x,y)` matching `transform-origin: top left; transform: rotate(deg);` |
| 3 | Shapes use same box fields; LINE uses width/height bounding box of segment |
| 4 | Auto layout frames emit **CSS flex** at compile time (`DesignCompiler` + `flexChildCss`); constraints for non-AL parents |
| 5 | TABLE layout, TEXT_PATH sampling |

## Compile pipeline (Phase 4+, pseudocode)

```text
function prepareForCompile(envelope, subtreeRootId, graph, renderContext):
  // MCP readonly path: no envelope clone; intrinsic sizing writes CompileRenderContext patches
  root = findNode(envelope.document, subtreeRootId, graph)
  applyAutoLayoutIntrinsicSizingDeep(root, envelope)  // patches when renderContext active
  syncHugTextLayoutMetricsDeep(root, envelope)
  return compileTree(envelope, root, renderContext)   // emit reads layoutW/layoutH + flex CSS

function prepareForCompileLegacy(envelope, subtreeRootId):
  env = structuredClone(envelope)   // non-MCP callers without renderContext
  ...
```

**Binding:** `get_design_context` / `get_screenshot` **must not** mutate the persisted `FileEnvelope`. MCP passes `renderContext` so compile uses overlay patches instead of cloning the envelope. Per-instance component masters may still be cloned until instance overlay parity is complete. Child positions inside auto-layout frames are resolved by the **browser layout engine** (flex), not by rewriting `x`/`y` on the document tree.

## Screenshot clip rectangle

Given target `nodeId`, clip rect is the node’s **border box** in coordinates of the compiled HTML root, including padding wrapper.

## Related documents

- [Rendering pipeline](./rendering-pipeline.md)
- [Document engine](./document-engine.md)
