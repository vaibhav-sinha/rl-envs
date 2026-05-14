# Document engine

[← Design index](./index.md) · [Data model](./data-model.md)

## Responsibilities

The `DocumentEngine` class is the **only** module allowed to mutate `FileEnvelope`. It:

1. Validates all incoming operations against the **current phase capability matrix**.
2. Allocates node IDs (`I{n}`) using `nextInternalId`.
3. Applies mutations in a **transaction** (all-or-nothing).
4. Invokes `PersistenceService.save` after successful commit.
5. Exposes read-only queries: `getNodeById`, `findSubtree`, `listPages`.

## Class surface (normative)

```typescript
export interface TransactionResult {
  success: true;
  touchedNodeIds: string[];
  warnings: string[];
}

export interface TransactionFailure {
  success: false;
  errorCode: EngineErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type EngineErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_NODE'
  | 'UNSUPPORTED_OPERATION'
  | 'UNSUPPORTED_PROPERTY'
  | 'PHASE_LOCKED'
  | 'CONSTRAINT_VIOLATION';

export class DocumentEngine {
  constructor(deps: {
    persistence: PersistenceService;
    phase: 1 | 2 | 3 | 4 | 5;
    logger: Logger;
  });

  getActiveFile(): FileEnvelope | null;
  getActiveFilePath(): string | null;

  /** Replace in-memory document and path; does not auto-save unless `save` true */
  async loadFromDisk(params: { absolutePath: string; save?: boolean }): Promise<void>;

  async createEmptyFile(params: {
    fileName: string;
    directory?: string;
  }): Promise<{ fileKey: string; filePath: string }>;

  /** Apply a batch of operations atomically */
  async applyTransaction(ops: EngineOperation[]): Promise<TransactionResult | TransactionFailure>;

  queryNode(nodeId: string): BaseNode | null;
  querySubtreeRoot(nodeId: string): BaseNode | null;
}
```

## Operation union (internal to engine, derived from MCP `use_figma`)

```typescript
export type EngineOperation =
  | { op: 'createNode'; parentId: string; index?: number; node: NewNodeSpec }
  | { op: 'updateNode'; nodeId: string; patch: Record<string, unknown> }
  | { op: 'deleteNode'; nodeId: string }
  | { op: 'moveNode'; nodeId: string; newParentId: string; index?: number };

export type NewNodeSpec = Omit<BaseNode, 'id'> & { type: NodeType };
```

**Rule:** `patch` keys **must** be whitelisted per node type and phase in `PHASE_MATRIX` (see below). Unknown keys → `UNSUPPORTED_PROPERTY`.

## Phase capability matrix (normative excerpt)

| Phase | Allowed `type` in `createNode` | Allowed patch top-level keys (representative) |
|-------|-------------------------------|--------------------------------------------------|
| 1 | `FRAME` under `PAGE` | `name`, `x`, `y`, `width`, `height`, `fills`, `strokes`, `strokeWeight` |
| 2 | `FRAME`, `TEXT` | + frame `backgrounds`, `clipsContent`; text fields per [data model](./data-model.md); node `opacity`, `visible`, `rotation`, `effects` shadow types |
| 3 | + `GROUP`, shapes… | + paints all kinds, stroke geometry, corners, `styledSegments` lists/OpenType, `upload_assets` not here (separate tool) |
| 4 | + layout, VECTOR, BOOLEAN… | auto layout keys, masks, blur effects |
| 5 | + COMPONENT*, TABLE… | variables, styles, instance props |

The implementation **must** ship `phase-matrix.ts` exporting machine-readable rules consumed by tests.

## Critical logic — transaction apply (pseudocode)

```text
function applyTransaction(ops: EngineOperation[]):
  if activeFile is null:
    return failure(PHASE_LOCKED, "no active file")

  working = deepClone(activeFile)           // full envelope clone (JSON round-trip acceptable Phase 1–2)
  touched = empty set
  warnings = empty list

  try:
    for op in ops:
      match op:
        case createNode:
          parent = findNode(working.document, op.parentId) or throw UNKNOWN_NODE
          validateParentAllowsChild(parent.type, op.node.type, phase)
          id = allocateId(working)
          node = normalizeNewNode(op.node, id)
          validateNodeForPhase(node, phase)
          insertChild(parent, op.index, node)
          touched.add(id)

        case updateNode:
          node = findNode(working.document, op.nodeId) or throw UNKNOWN_NODE
          patch = whitelistPatch(op.patch, node.type, phase)
          validatePatch(node, patch)
          applyPatch(node, patch)   // fills/strokes: replace entire arrays when provided
          touched.add(node.id)

        case deleteNode:
          removeSubtree(working.document, op.nodeId)
          touched.add(op.nodeId)

        case moveNode:
          detach(working.document, op.nodeId)
          attach(working.document, op.newParentId, op.index, op.nodeId)
          touched.add(op.nodeId)

    validateTreeInvariants(working.document)

  catch e:
    return mapError(e)              // working discarded; activeFile unchanged

  activeFile = working
  await persistence.save({ path: activeFilePath, envelope: activeFile })
  return success(touched, warnings)
```

## Patch application rules (fills / strokes)

- **Array fields** (`fills`, `strokes`, `backgrounds`, `effects`): MCP patch **replaces** the entire array when the key is present (Plugin API “replace whole property” pattern).
- **Omit key:** leave existing value unchanged.

## ID allocation (pseudocode)

```text
function allocateId():
  id = "I" + str(activeFile.nextInternalId)
  activeFile.nextInternalId += 1
  return id
```

## Validation highlights

| Check | Error code |
|-------|------------|
| `width` or `height` < 0 | `CONSTRAINT_VIOLATION` |
| Unknown `parentId` | `UNKNOWN_NODE` |
| `FRAME` not under `PAGE` or `FRAME` in Phase 1 | `VALIDATION_ERROR` |
| `TEXT` with `end <= start` in any segment | `VALIDATION_ERROR` |
| Excluded domain keys in patch (`pluginData`, …) | `VALIDATION_ERROR` |

## Read paths used by tools

```typescript
export function collectMetadataTree(root: BaseNode, options: { maxDepth?: number }): MetadataNodeDTO;
export function compileDesignContext(root: BaseNode, targetId: string): CompiledDesign;
```

DTO definitions live in [Tools schemas](./tools-schemas.md).

## Related documents

- [Persistence](./persistence.md)
- [Tools schemas](./tools-schemas.md)
- [Rendering pipeline](./rendering-pipeline.md)
