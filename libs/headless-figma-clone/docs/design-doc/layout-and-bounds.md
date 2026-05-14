# Bounding boxes and layout resolution

[← Design index](./index.md)

## Phased responsibility

| Phase | Responsibility |
|-------|----------------|
| 1 | Node `x,y,width,height` are **authoritative** for FRAME; no auto layout. |
| 2 | Compute `absoluteBoundingBox` for FRAME/TEXT with rotation **optional** — **binding:** if `rotation` present, `absoluteBoundingBox` is axis-aligned bounding box (AABB) of rotated rect around top-left pivot **default** pivot `(0,0)` of node — **correction:** CSS uses center transform in later phases; Phase 2 binding: pivot is **top-left** `(x,y)` matching `transform-origin: top left; transform: rotate(deg);` |
| 3 | Shapes use same box fields; LINE uses width/height bounding box of segment |
| 4 | Auto layout engine computes child positions before compile; constraints for non-AL parents |
| 5 | TABLE layout, TEXT_PATH sampling |

## Layout pass order (Phase 4+, pseudocode)

```text
function prepareForCompile(envelope, subtreeRootId):
  root = findNode(envelope.document, subtreeRootId)
  if subtree contains auto layout frames:
    runAutoLayoutPass(root)        // mutates a **compile-only** tree copy, not persisted document
  if contains masks/booleans:
    flattenOrMarkSvgLayers(root)
  computeAbsoluteBoxes(root)
  return compileTree
```

**Binding:** auto layout resolution **must not** mutate persisted `FileEnvelope` during `get_design_context` / `get_screenshot`; operate on an **ephemeral clone** of the subtree.

## Screenshot clip rectangle

Given target `nodeId`, clip rect is the node’s **border box** in coordinates of the compiled HTML root, including padding wrapper.

## Related documents

- [Rendering pipeline](./rendering-pipeline.md)
- [Document engine](./document-engine.md)
