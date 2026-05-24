# Coordinate model (Figma Plugin API parity)

[← Design index](./index.md)

HFC stores node geometry using **Figma Plugin API** semantics. There are no runtime heuristics that rewrite coordinates; import, engine, compiler, `use_figma`, and `get_metadata` share one model implemented in `src/geometry/coordinates.ts`.

## Storage (`design.hfc.json`)

| Field | Semantics |
| --- | --- |
| `x`, `y` | Translation relative to the **container parent** |
| `relativeTransform[0][2]`, `[1][2]` | Same translation as `x`/`y` (kept in sync on import) |
| `width`, `height` | Local box size |

**Container parents** (change the coordinate reference for descendants): `PAGE`, `FRAME`, `SECTION`, `COMPONENT`, `INSTANCE`.

**Non-container wrappers** (do **not** change the coordinate reference): `GROUP`, `BOOLEAN_OPERATION`, `TRANSFORM_GROUP`. A rectangle inside a group stores `x`/`y` relative to its container frame/section/page, not relative to the group.

See [Figma `relativeTransform`](https://developers.figma.com/docs/plugins/api/properties/nodes-relativetransform/).

## Read paths

| Surface | Coordinates |
| --- | --- |
| `use_figma` `node.x` / `node.y` | Stored container-parent-relative values (no transform) |
| `get_metadata` `bounds` | **Page-absolute** box (`absoluteBoundingBox` semantics), computed at read time via `computeAbsoluteBoundingBox()` |
| Compiler / screenshots | Stored parent-relative values; compiler positions children inside container divs |

## Write paths

| Surface | Behavior |
| --- | --- |
| Import from plugin snapshot | When `absoluteBoundingBox` exists, derive `x`/`y` by subtracting the container parent's page-absolute origin. Raw export `x`/`y` used only when no bounding box is present. |
| `createNode` / `appendChild` / `moveNode` | **No auto-rebase** — coords stay as set, relative to the new container parent (Figma parity) |
| Boolean create / `syncBooleanOperationBounds` | Explicit operand rebase (deterministic graph op, not a heuristic) |

## Container-parent walk (import)

When importing children of a `GROUP`, the page-absolute origin passed to descendants does **not** advance by the group's translation — only container parents advance `containerChildPageOrigin()`.

## Phase 1 scope

- Absolute bounds use axis-aligned sums of container-parent translations (rotation-aware AABB is follow-up work).
- Compiler rotation uses existing pivot paths; geometry module documents translation-only absolute origin.

## Baseline re-import

Existing `.hfc.json` files that were imported with page-absolute values in `x`/`y` must be **re-exported from Figma and re-imported** after this fix. There is no automated migration CLI.

Spot-check after re-import (oker baseline): section `I55` child frame `I56` should have `x ≈ 2742` (not `4921`).
