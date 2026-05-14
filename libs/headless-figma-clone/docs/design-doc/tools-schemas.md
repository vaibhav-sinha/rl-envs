# Tool input/output schemas

[← Design index](./index.md) · [PRD MCP tools](../prd/mcp-tools.md)

All tool bodies are JSON objects validated with **Zod** schemas colocated with handlers (`src/mcp/schemas/*.ts`).

## Common types

```typescript
export const NodeIdSchema = z.string().regex(/^I[0-9]+$/);
export const FileKeySchema = z.string().min(1); // ULID string
```

## `create_new_file`

**Input**

```typescript
export const CreateNewFileInput = z.object({
  name: z.string().min(1).max(256).optional(),
  directory: z.string().optional(), // absolute or relative → resolved against cwd then HFC_WORKSPACE_DIR rules
});
```

**Resolution:** If `directory` is relative, resolve with `path.resolve(process.cwd(), directory)`. If absolute, use as-is. If omitted, use `HFC_WORKSPACE_DIR` per [Configuration](./configuration.md).

**Output**

```typescript
export const CreateNewFileOutput = z.object({
  ok: z.literal(true),
  data: z.object({
    fileKey: z.string(),
    filePath: z.string(), // absolute
  }),
});
```

## `get_metadata`

**Input**

```typescript
export const GetMetadataInput = z.object({
  fileKey: z.string().optional(), // ignored Phase 1 (single active file); reserved for multi-file future
  nodeId: z.string().optional(),  // default: first PAGE node id
  maxDepth: z.number().int().positive().optional(),
});
```

**Default `nodeId`:** If omitted, use **the first page** in `document.children[0].id`.

**Output**

```typescript
export interface MetadataNodeDTO {
  id: string;
  type: NodeType;
  name: string;
  bounds?: { x: number; y: number; width: number; height: number };
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  clipsContent?: boolean;
  textLength?: number;            // TEXT only
  effectTypes?: string[];         // enum names
  children?: MetadataNodeDTO[];
}

export const GetMetadataOutput = z.object({
  ok: z.literal(true),
  data: z.object({
    metadataFormatVersion: z.literal(1),
    childStacking: z.literal('later-children-on-top'),
    root: MetadataNodeDTO,
  }),
});
```

## `get_design_context`

**Input**

```typescript
export const GetDesignContextInput = z.object({
  nodeId: NodeIdSchema,
  includeCss: z.boolean().optional().default(true),
  inlineCss: z.boolean().optional().default(true), // Phase 1: must be true; compiler inlines into <style>
  viewportPaddingPx: z.number().optional().default(0),
});
```

**Output**

```typescript
export const GetDesignContextOutput = z.object({
  ok: z.literal(true),
  data: z.object({
    html: z.string(),
    css: z.string(), // may be empty string when fully inlined
    warnings: z.array(z.string()),
    assets: z
      .array(
        z.object({
          id: z.string(),
          mimeType: z.string(),
          dataBase64: z.string(),
        })
      )
      .optional(),
  }),
});
```

## `get_screenshot`

**Input**

```typescript
export const GetScreenshotInput = z.object({
  nodeId: NodeIdSchema,
  format: z.enum(['png', 'jpeg']).default('png'),
  scale: z.number().positive().default(1),
  deviceScaleFactor: z.number().positive().optional(), // Phase 2: maps to Playwright `deviceScaleFactor`
  background: z.enum(['white', 'transparent']).optional(), // Phase 2
});
```

**Output**

```typescript
export const GetScreenshotOutput = z.object({
  ok: z.literal(true),
  data: z.object({
    mimeType: z.enum(['image/png', 'image/jpeg']),
    dataBase64: z.string(),
    width: z.number().int(),
    height: z.number().int(),
  }),
});
```

## `use_figma`

Aligned with Figma MCP **input shape**: primary path is a **JavaScript string** (`code`) run in an async context (top-level `await`, `return` for agent-visible output). Optional `skillNames` is accepted for parity with Figma (logging only). Legacy **`operations`** batch remains supported; **exactly one** of `code` or `operations` must be provided.

**Input (normative envelope)**

```typescript
export const UseFigmaInput = z
  .object({
    /** Plugin API–style script body; executed as `new AsyncFunction('figma', code)` (host wraps async). */
    code: z.string().optional(),
    /** Figma-compatible logging flag; does not affect execution. */
    skillNames: z.string().max(512).optional(),
    /** Legacy deterministic batch (mutually exclusive with `code`). */
    operations: z.array(UseFigmaOperation).max(200).optional(),
  })
  .superRefine((v, ctx) => {
    const hasCode = typeof v.code === 'string' && v.code.trim().length > 0;
    const hasOps = Array.isArray(v.operations) && v.operations.length > 0;
    if (hasCode === hasOps) {
      ctx.addIssue({ code: 'custom', message: 'Provide either non-empty `code` or non-empty `operations`, not both or neither.' });
    }
  });

export const UseFigmaOperation = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('createNode'),
    parentId: z.string(),
    index: z.number().int().nonnegative().optional(),
    node: z.object({
      type: z.string(),
      name: z.string().optional(),
    }).passthrough(), // type-specific fields validated after discriminating `type`
  }),
  z.object({
    operation: z.literal('updateNode'),
    nodeId: z.string(),
    properties: z.record(z.unknown()),
  }),
  z.object({
    operation: z.literal('deleteNode'),
    nodeId: z.string(),
  }),
  z.object({
    operation: z.literal('moveNode'),
    nodeId: z.string(),
    newParentId: z.string(),
    index: z.number().int().nonnegative().optional(),
  }),
]);
```

**Script path (`code`)** — Phase 1 exposes a minimal `figma` global: `root`, `currentPage`, `setCurrentPageAsync`, `createFrame`, `notify` (throws `"not implemented"`), `closePlugin` (throws). Nested `RuntimeFrame.appendChild` is supported after the parent frame has been appended. The host applies queued engine ops in **one transaction** after the script completes (atomic on failure, matching Figma semantics).

**Dispatch mapping** (legacy `operations`)

| `operation` | Engine operation |
|-------------|------------------|
| `createNode` | `{ op: 'createNode', ... }` |
| `updateNode` | `{ op: 'updateNode', patch: properties }` |
| `deleteNode` | `{ op: 'deleteNode' }` |
| `moveNode` | `{ op: 'moveNode' }` |

**Output**

```typescript
export const UseFigmaOutput = z.object({
  ok: z.literal(true),
  data: z.object({
    touchedNodeIds: z.array(z.string()),
    warnings: z.array(z.string()),
    /** Present when the call used `code`: JSON-serialized script `return` value. */
    result: z.unknown().optional(),
  }),
});
```

## `open_file` (Phase 2; not in PRD tool list but **required by this design**)

**Input**

```typescript
export const OpenFileInput = z.object({
  path: z.string().min(1), // absolute path preferred; relative resolved against cwd then must exist
});
```

**Output**

```typescript
export const OpenFileOutput = z.object({
  ok: z.literal(true),
  data: z.object({ fileKey: z.string(), filePath: z.string() }),
});
```

## `get_variable_defs` (Phase 5)

**Input**

```typescript
export const GetVariableDefsInput = z.object({
  nodeId: NodeIdSchema.optional(),
});
```

**Output before Phase 5:** tool not registered **or** if registered for early testing:

```typescript
{ ok: true, data: { variables: [], modes: [], warnings: ['not_implemented'] } }
```

**Binding:** Prefer **not registering** the tool until Phase 5 to avoid clients relying on stub shape.

## `search_design_system` (Phase 5)

```typescript
export const SearchDesignSystemInput = z.object({
  query: z.string().min(1),
  types: z.array(z.enum(['component', 'variable', 'style'])).optional(),
  strategy: z.enum(['text', 'semantic', 'auto']).default('text'),
});
```

**Output**

```typescript
export const SearchDesignSystemOutput = z.object({
  ok: z.literal(true),
  data: z.object({
    matches: z.array(
      z.object({
        kind: z.enum(['component', 'variable', 'style']),
        id: z.string(),
        name: z.string(),
        snippet: z.string().optional(),
        score: z.number().optional(),
      })
    ),
  }),
});
```

**Text search normative rules:** case-fold using `String.prototype.toLocaleLowerCase('en-US')`; substring match; deterministic sort: `(matchIndex asc, fieldPriority asc, id asc)` where `fieldPriority` is `name=0, description=1, other=2`.

## `upload_assets` (Phase 3)

**Binding input:** single canonical approach: **`dataUrl` string** (`data:image/png;base64,....`) OR **`filePath` absolute local path** (server reads bytes). **Not** raw binary in JSON.

```typescript
export const UploadAssetsInput = z.object({
  dataUrl: z.string().optional(),
  filePath: z.string().optional(),
  suggestedName: z.string().max(128).optional(),
}).refine((v) => Boolean(v.dataUrl) !== Boolean(v.filePath), {
  message: 'Exactly one of dataUrl or filePath is required',
});
```

**Output**

```typescript
export const UploadAssetsOutput = z.object({
  ok: z.literal(true),
  data: z.object({
    assetId: z.string(),
    sha256: z.string(),
    mimeType: z.string(),
  }),
});
```

## Related documents

- [Document engine](./document-engine.md)
- [MCP layer](./mcp-layer.md)
