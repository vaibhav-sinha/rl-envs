# HFC known issues / deferred work

## Clone materialize: IMAGE fills lost on instance-inner clones (Track 3 — deferred)

**Status:** Not implemented (removed May 2026 due to performance regressions on large oker fixtures).

### Symptom

In the **oker brand-filter** agent trajectory, brand logos appeared in JSON (`imageHash` present on nodes) but were **invisible in PNG/HTML render**. Structural verifiers could pass while the visual judge failed on checkboxes/icons.

Agents often worked around this by:

1. Finding a rectangle inside a `BrandSpotlight` / `BrandFavicon` instance (e.g. `Rectangle 2851` under `I11240`)
2. Cloning that inner node into a standalone frame in the brand row
3. Optionally resizing a clipped wrapper to 32×32

The cloned standalone geometry rendered as empty/grey placeholders even though the same fill data existed on the live instance.

### Root cause

Two render paths diverge:

| Path | When | Merge behavior | IMAGE fills |
|------|------|----------------|-------------|
| **Instance emit** | `emitInstance` compiles an `INSTANCE` on canvas | Runs `prepareInstanceComponentRoot` + `mergeDetachedChildrenIntoRoot` | Merged IMAGE hashes render correctly |
| **Standalone emit** | Agent clones inner node → duplicate becomes sibling `RECTANGLE`/`FRAME` | `emitRectangle` / `emitFrame` use raw node `fills` only | Raw clone may lack merged appearance from instance master + detached subtree |

`duplicateNode` / `clone()` performs a **shallow structural copy** (`cloneSceneSubtreeWithNewIds`). It does **not** bake in the merged paints that the compile path applies only inside `emitInstance`.

Related but separate issues (fixed in Track 1/2):

- `mainComponent` null when master lives only in `components[]` sidecar
- `detachInstance()` throwing before using stored `inst.children` when `mainComponentId` is bogus (e.g. `Category/L3` `I38349` with `mainComponentId: I0`)

### What was attempted (Track 3)

1. **`render/instancePrepare.ts`** — extract shared instance root preparation from `DesignCompiler` (kept; compile-time only).
2. **`engine/instanceMaterialize.ts`** — on `duplicateNode`, walk up to nearest ancestor `INSTANCE`, call `buildPreparedInstanceRoot`, copy merged `fills`/`strokes`/`effects`/corner radii onto the clone by matching `sourceFigmaId` / `name:type`.
3. Hook in **`duplicateNodeInEnvelope`** after `cloneSceneSubtreeWithNewIds`.

### Why it was removed

Hooking materialize into **every** `duplicateNode` added cost even when no instance ancestor exists:

- Document parent-index build on first clone per envelope (oker-final-design is huge)
- When ancestor exists: full `buildPreparedInstanceRoot` (master resolve + detached merge) per clone

This caused **120s+ timeouts** on unrelated oker integration tests that batch-clone top-level frame children (`oker-i1538-clone`, `useFigmaScript.detach-attach`), plus risk to MCP clone sequences.

Track 1/2 (`mainComponent` resolution, `detachInstance` stored-children fallback, clip-safe resize) do **not** add per-clone overhead and remain shipped.

### Fixture references (oker-final-design)

| Node | Role |
|------|------|
| `I11240` | `BrandFavicon` INSTANCE (parent of icon wrapper) |
| `I11242` | `Rectangle 2851` — inner rect with IMAGE fill agents clone |
| `I38349` | `Category/L3` INSTANCE — bogus `mainComponentId`, stored children |
| `I38350` | Checkbox instance in same row |

Example merged hash on `I11242`: `213d85042a723b3a5db86d7c13e521992d1278378dc34d7108dfd345e5d70e88`

### Suggested future approaches

Pick one that avoids O(n) work on every clone of large screens:

1. **Compile-time materialize** — when `emitRectangle` sees a node that was cloned from instance context (flag or provenance metadata on node), run merge then.
2. **Lazy / scoped materialize** — only for leaf shapes (`RECTANGLE`, `VECTOR`, …) with an instance ancestor, not whole-frame clones.
3. **On-demand only** — explicit API (`node.flatten()` / `materializeAppearance()`) instead of automatic hook in `duplicateNode`.
4. **Cheaper ancestor check** — incremental parent map invalidated on structural ops; defer `buildPreparedInstanceRoot` until compile or until clone target is a leaf without IMAGE fill.

### Test to add when re-implementing

Integration test (oker fixture pattern from `oker-i1538-clone.test.ts`):

- Script: clone `I11242` from `BrandFavicon`, reparent into wrapper frame
- Compile subtree with `buildImageDataUrlForSubtree`
- Assert CSS contains `background-image` for the image hash, no `missing_image_data_url` warnings

### Related files (historical)

- `src/render/instancePrepare.ts` — shared compile prep (retained)
- `src/render/instanceMerge.ts` — detached subtree merge keys (`normalizeSourceFigmaId`, `name:type`)
- `src/render/DesignCompiler.ts` — `emitInstance` merge path (working reference)
