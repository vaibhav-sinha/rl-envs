# Observability, errors, and logging

[← Design index](./index.md)

## Logger interface

```typescript
export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
}
```

## MCP / HTTP fields (Phase 2 Should, Phase 1 minimal)

Every tool invocation logs:

- `tool` name
- `durationMs`
- `ok` boolean
- `requestId`

Never log base64 image payloads or file contents.

## Error mapping table

| Engine / compiler code | HTTP | MCP tool body `errorCode` |
|------------------------|------|---------------------------|
| `UNKNOWN_NODE` | 404 | `UNKNOWN_NODE` |
| `VALIDATION_ERROR` | 400 | `VALIDATION_ERROR` |
| `UNSUPPORTED_OPERATION` | 400 | `UNSUPPORTED_OPERATION` |
| Playwright timeout | 504 | `SCREENSHOT_TIMEOUT` |

## Related documents

- [MCP layer](./mcp-layer.md)
