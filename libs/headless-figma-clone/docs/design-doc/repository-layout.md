# Repository layout and packages

[← Design index](./index.md)

## Monorepo placement

Implement the service under:

`libs/headless-figma-clone/src/`

## Directory tree (normative)

```text
libs/headless-figma-clone/
  package.json
  tsconfig.json
  src/
    index.ts                 # library exports (optional)
    cli.ts                   # process entry: parses argv, starts transports
    server/
      createHttpServer.ts    # Express/Fastify/native http — pick one: **binding: `node:http` only** in Phase 1 to minimize deps
      healthRoute.ts
      mcpStreamableHttp.ts   # wires MCP SDK Streamable HTTP transport
    mcp/
      registerTools.ts
      handlers/
        createNewFile.ts
        getMetadata.ts
        getDesignContext.ts
        getScreenshot.ts
        useFigma.ts
        getVariableDefs.ts    # Phase 5
        searchDesignSystem.ts # Phase 5
        uploadAssets.ts       # Phase 3
    engine/
      DocumentEngine.ts
      ActiveFileContext.ts
      mutations/
        applyTransaction.ts
        operations/
          createNode.ts
          updateNode.ts
          deleteNode.ts
          moveNode.ts
      validation/
        validateNode.ts
        validatePaint.ts
        validateFileEnvelope.ts
    model/
      types.ts               # re-exports from schema or hand-written types
      guards.ts              # type predicates
    persistence/
      JsonPersistence.ts
      atomicWriteFile.ts
    render/
      DesignCompiler.ts
      CssEmitter.ts
      HtmlEmitter.ts
      SvgEmitter.ts          # Phase 4+
    screenshot/
      PlaywrightScreenshotService.ts
    config/
      loadConfig.ts
      types.ts
    util/
      id.ts
      errors.ts
  tests/
    ...                      # see [Testing](./testing.md)
  docs/
    prd/
    design-doc/
```

## Public API (library mode)

Export for programmatic embedding:

```typescript
// src/publicApi.ts
export type { HeadlessFigmaConfig } from './config/types.js';
export { startHeadlessFigmaServer } from './server/startHeadlessFigmaServer.js';
export { DocumentEngine } from './engine/DocumentEngine.js';
```

```typescript
// function signature (normative)
export async function startHeadlessFigmaServer(
  config: HeadlessFigmaConfig
): Promise<{ httpPort: number; close: () => Promise<void> }>;
```

## Related documents

- [Document engine](./document-engine.md)
- [Testing](./testing.md)
