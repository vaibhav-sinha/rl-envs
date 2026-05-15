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
function prepareForCompile(envelope, subtreeRootId):
  env = structuredClone(envelope)   // compile-only copy; persisted JSON unchanged
  root = findNode(env.document, subtreeRootId)
  if contains masks/booleans:
    flattenOrMarkSvgLayers(root)    // SVG branches in HTML output
  return compileTree(env, root)     // auto-layout: display:flex + flexChildLayoutCss on clone
```

**Binding:** `get_design_context` / `get_screenshot` **must not** mutate the persisted `FileEnvelope`; `DesignCompiler` clones the envelope before emitting HTML/CSS. Child positions inside auto-layout frames are resolved by the **browser layout engine** (flex), not by rewriting `x`/`y` on the document tree.

## Screenshot clip rectangle

Given target `nodeId`, clip rect is the node’s **border box** in coordinates of the compiled HTML root, including padding wrapper.

## Related documents

- [Rendering pipeline](./rendering-pipeline.md)
- [Document engine](./document-engine.md)
