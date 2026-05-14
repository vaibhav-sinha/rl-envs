# MCP server layer

[← Design index](./index.md) · [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)

## SDK usage (normative)

- Package: `@modelcontextprotocol/sdk` (pin exact version in `package.json`).
- Instantiate **`McpServer`** (or transport-specific server per SDK version) once per process.
- Register tools with **Zod** or JSON Schema–compatible input validators shipped with the SDK.

## Server composition

```typescript
export function createMcpServer(deps: {
  engine: DocumentEngine;
  compiler: DesignCompiler;
  screenshots: PlaywrightScreenshotService;
  phase: 1 | 2 | 3 | 4 | 5;
  logger: Logger;
}): McpServer;
```

## Tool handler contract

Each handler:

1. Parses/validates input → on failure return MCP error with `INVALID_PARAMS`.
2. Calls engine/compiler/screenshot **without** catching expected domain errors.
3. Maps domain errors to structured tool content:

```typescript
export interface ToolErrorBody {
  ok: false;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ToolSuccessBody<T> {
  ok: true;
  data: T;
  warnings?: string[];
}
```

**Binding:** tools return **JSON text content** embedding `{ ok, ... }` for maximum client compatibility (in addition to any SDK-level structured content).

## Transports

### Streamable HTTP

- Path: **`POST /mcp`** (single endpoint) — **binding** name; document in README.
- Wire format follows SDK Streamable HTTP transport for the pinned SDK version (implementation must copy the official example project structure for that version).

### stdio

- Use SDK `StdioServerTransport` connected to the same `McpServer` instance.
- When both HTTP and stdio are enabled, **two separate MCP server instances are forbidden** — **binding:** run **one** `McpServer` with **one** active transport selected by CLI **or** run stdio-only without HTTP when `HFC_HTTP_DISABLE=1`.

**Clarification:** Default `http` transport: attach Streamable HTTP to HTTP server. For `stdio` mode without HTTP, still expose health by writing to stderr log line `HEALTH listening skipped` — **simpler binding:** `stdio` mode **does not** start HTTP; health checks use process alive. FR-PLAT-003 satisfied in `http` default mode; stdio mode documents exception.

**Final binding:**

| CLI `--transport` | HTTP server | MCP |
|-------------------|------------|-----|
| `http` (default) | Yes (`/health`, `/mcp`) | Streamable HTTP |
| `stdio` | No | stdio |

To run both simultaneously (rare), spawn two processes.

## Request correlation

- Generate `requestId` ULID per MCP request; pass to `logger.child({ requestId })`.

## Related documents

- [Tools schemas](./tools-schemas.md)
- [HTTP host](./http-host.md)
- [Observability](./observability.md)
