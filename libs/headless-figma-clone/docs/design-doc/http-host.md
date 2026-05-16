# HTTP host

[← Design index](./index.md)

## Stack choice

**Binding:** use Node built-in `http.createServer` (no Express/Fastify in Phase 1) to minimize dependencies.

## Routes (normative)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/health` | none | — | `200 application/json` `{"status":"ok","version":"<semver>","previewEndpoint":"/preview"}` |
| GET | `/files` | none | — | `200 text/html` workspace file browser |
| GET | `/files/active` | none | `?path=<abs>&redirect=/preview` | `200` JSON or `302` redirect |
| GET | `/preview` | none | `?pageId=<id>` | `200 text/html` design preview with page toolbar |
| POST | `/mcp` | none (local) | Streamable HTTP per SDK | per SDK |

**CORS:** not required (localhost tooling). If added later, restrict origins.

## Error JSON shape (HTTP non-MCP)

```typescript
{ "error": { "code": string, "message": string, "details"?: unknown } }
```

## MCP endpoint wiring

Implementation copies the SDK-recommended pattern: upgrade/long-poll or stream as required **for the pinned SDK version** — **must** add an integration test that performs one tool call over HTTP transport.

## Static assets (Phase 3+)

Optional `GET /assets/:assetId` serving files from active file’s asset directory with sanitized `assetId` (alphanumeric only).

## Related documents

- [MCP layer](./mcp-layer.md)
- [Configuration](./configuration.md)
- [Security](./security.md)
